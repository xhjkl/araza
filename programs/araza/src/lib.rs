use core::mem::size_of;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        burn, close_account, mint_to, transfer_checked, Burn, CloseAccount, Mint, MintTo,
        TokenAccount, TokenInterface, TransferChecked,
    },
};

declare_id!("AnymAL5sjUsgFVFabV2bs1cbMKVT45dcGHCaCUJB4RDg");

const VERSION: u8 = 1;

/// Ensure the program is initialized before accepting user actions.
fn has_version(state: &Account<ProgramState>) -> Result<()> {
    if state.version != VERSION {
        return Err(ProgramError::InvalidAccountData.into());
    }
    Ok(())
}

/// Ensure the caller is the upgrade authority of the program.
/// On localnet, skip the check and allow everyone.
fn is_privileged(signer: &Signer) -> Result<()> {
    use std::str::FromStr;

    let owner = option_env!("OWNER")
        .and_then(|s| Pubkey::from_str(s).ok())
        .unwrap_or_else(|| signer.key());
    if signer.key() != owner {
        return Err(Error::Unauthorized.into());
    }
    Ok(())
}

#[program]
pub mod araza {
    use super::*;

    #[access_control(is_privileged(&ctx.accounts.signer))]
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Nominate the treasurer:
        ctx.accounts.state.treasurer = ctx.accounts.treasurer.key();

        // Record the program version:
        ctx.accounts.state.version = VERSION;

        Ok(())
    }

    #[access_control(is_privileged(&ctx.accounts.signer))]
    pub fn configure(ctx: Context<Configure>) -> Result<()> {
        // Record the right USDC mint:
        ctx.accounts.state.usdc_mint = ctx.accounts.usdc_mint.key();

        // Record the program version:
        ctx.accounts.state.version = VERSION;

        Ok(())
    }

    /// Deposit USDC and mint Digital Dollars (DD)
    #[access_control(has_version(&ctx.accounts.state))]
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // Transfer USDC tokens from the user's USDC account to our vault
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    authority: ctx.accounts.user.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    from: ctx.accounts.from_account.to_account_info(),
                    to: ctx.accounts.usdc_vault.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.usdc_mint.decimals,
        )?;

        // Mint DD tokens to the user
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    authority: ctx.accounts.dd_mint.to_account_info(),
                    mint: ctx.accounts.dd_mint.to_account_info(),
                    to: ctx.accounts.to_account.to_account_info(),
                },
                &[&[b"mint/dd", &[ctx.bumps.dd_mint]]],
            ),
            amount,
        )?;

        Ok(())
    }

    /// Redeem DD to receive USDC
    #[access_control(has_version(&ctx.accounts.state))]
    pub fn redeem(ctx: Context<Redeem>, amount: u64) -> Result<()> {
        burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    authority: ctx.accounts.user.to_account_info(),
                    mint: ctx.accounts.dd_mint.to_account_info(),
                    from: ctx.accounts.from_account.to_account_info(),
                },
                &[&[b"mint/dd", &[ctx.bumps.dd_mint]]],
            ),
            amount,
        )?;

        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    authority: ctx.accounts.usdc_vault.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    from: ctx.accounts.usdc_vault.to_account_info(),
                    to: ctx.accounts.to_account.to_account_info(),
                },
                &[&[b"vault/usdc", &[ctx.bumps.usdc_vault]]],
            ),
            amount,
            ctx.accounts.usdc_mint.decimals,
        )?;

        Ok(())
    }

    /// Offer DD for fiat exchange
    ///
    /// This will create an escrow account for the user's DD tokens,
    /// and transfer those to the escrow.
    ///
    /// The daemon will then choose the best offer for the user,
    /// and release the funds to the beneficiary,
    /// after both ends of the deal are settled.
    #[access_control(has_version(&ctx.accounts.state))]
    pub fn offer_dd(ctx: Context<OfferDD>, amount: u64) -> Result<()> {
        // Transfer the DD tokens from the user to the escrow:
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    authority: ctx.accounts.user.to_account_info(),
                    mint: ctx.accounts.dd_mint.to_account_info(),
                    from: ctx.accounts.from_account.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.dd_mint.decimals,
        )?;

        Ok(())
    }

    /// Offer fiat for DD exchange
    ///
    /// This is an extension point for when we want to advertise all the fiat offers on chain.
    #[access_control(has_version(&ctx.accounts.state))]
    pub fn offer_fiat(ctx: Context<OfferFiat>, _amount: u64) -> Result<()> {
        // At this point the whole fiat side is handled solely by the daemon.
        Ok(())
    }

    /// Execute the escrow, assuming the associated deal is fully settled
    #[access_control(has_version(&ctx.accounts.state))]
    pub fn release_funds(ctx: Context<ReleaseFunds>) -> Result<()> {
        // Since it's a non-native account, we need to transfer
        // the whole balance in a separate step:
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    authority: ctx.accounts.escrow.to_account_info(),
                    mint: ctx.accounts.dd_mint.to_account_info(),
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.beneficiary.to_account_info(),
                },
                &[&[
                    b"escrow",
                    ctx.accounts.user.key().as_ref(),
                    &[ctx.bumps.escrow],
                ]],
            ),
            ctx.accounts.escrow.amount,
            ctx.accounts.dd_mint.decimals,
        )?;

        // And now we can close the escrow account:
        close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                authority: ctx.accounts.escrow.to_account_info(),
                account: ctx.accounts.escrow.to_account_info(),
                destination: ctx.accounts.beneficiary.to_account_info(),
            },
            &[&[
                b"escrow",
                ctx.accounts.user.key().as_ref(),
                &[ctx.bumps.escrow],
            ]],
        ))?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Who made the call
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Internal state of the program
    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + size_of::<ProgramState>(),
        seeds = [],
        bump
    )]
    pub state: Account<'info, ProgramState>,

    /// CHECK: This is only accessible by the upgrade authority.
    /// And we only need the public key from it to store it in the program state.
    ///
    /// This is the account that can call `release_funds`, normally the daemon.
    #[account()]
    pub treasurer: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Configure<'info> {
    /// Who made the call
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Internal state of the program
    #[account(mut, seeds = [], bump)]
    pub state: Account<'info, ProgramState>,

    /// Remembering the mint of the USDC tokens
    /// to make sure we only accept real USDC tokens in the subsequent instructions.
    #[account(mint::token_program = token_program)]
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,

    /// Where we store the USDC tokens given to us by the users
    #[account(
        init_if_needed,
        payer = signer,
        token::mint = usdc_mint,
        token::authority = usdc_vault,
        seeds = [b"vault/usdc"],
        bump,
    )]
    pub usdc_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The mint of the DD tokens
    #[account(
        init_if_needed,
        payer = signer,
        mint::decimals = 6,
        mint::authority = dd_mint,
        seeds = [b"mint/dd"],
        bump,
    )]
    pub dd_mint: Box<InterfaceAccount<'info, Mint>>,

    /// SPL token program
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(seeds = [], bump)]
    pub state: Account<'info, ProgramState>,

    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, token::mint = usdc_mint)]
    pub from_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = dd_mint,
        associated_token::authority = user,
    )]
    pub to_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = usdc_mint,
        seeds = [b"vault/usdc"],
        bump,
    )]
    pub usdc_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mint::token_program = token_program,
        constraint = state.usdc_mint == usdc_mint.key()
    )]
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        mint::token_program = token_program,
        seeds = [b"mint/dd"],
        bump,
    )]
    pub dd_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(seeds = [], bump)]
    pub state: Account<'info, ProgramState>,

    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, token::mint = dd_mint)]
    pub from_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = usdc_mint)]
    pub to_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = usdc_mint,
        seeds = [b"vault/usdc"],
        bump,
    )]
    pub usdc_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mint::token_program = token_program,
        constraint = state.usdc_mint == usdc_mint.key()
    )]
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        mint::token_program = token_program,
        seeds = [b"mint/dd"],
        bump,
    )]
    pub dd_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OfferDD<'info> {
    #[account(seeds = [], bump)]
    pub state: Account<'info, ProgramState>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, token::mint = dd_mint)]
    pub from_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mint::token_program = token_program,
        seeds = [b"mint/dd"],
        bump,
    )]
    pub dd_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = user,
        token::mint = dd_mint,
        token::authority = escrow,
        seeds = [b"escrow", user.key().as_ref()],
        bump,
    )]
    pub escrow: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OfferFiat<'info> {
    #[account(seeds = [], bump)]
    pub state: Account<'info, ProgramState>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReleaseFunds<'info> {
    #[account(seeds = [], bump)]
    pub state: Account<'info, ProgramState>,

    #[account(
        mut,
        constraint = state.treasurer == *treasurer.key @ Error::Unauthorized
    )]
    pub treasurer: Signer<'info>,

    /// CHECK: We only need the public key from it to look up the escrow account.
    #[account()]
    pub user: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = dd_mint,
        token::authority = escrow,
        seeds = [b"escrow", user.key().as_ref()],
        bump,
    )]
    pub escrow: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, token::mint = dd_mint)]
    pub beneficiary: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mint::token_program = token_program,
        seeds = [b"mint/dd"],
        bump,
    )]
    pub dd_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[account]
pub struct ProgramState {
    /// Version of the program
    ///
    /// That way the program will refuse to work
    /// until `initialize` is called by the upgrade authority.
    pub version: u8,

    /// The account that can call `release_funds`
    pub treasurer: Pubkey,

    /// The mint of the USDC tokens
    pub usdc_mint: Pubkey,
}

#[error_code]
pub enum Error {
    #[msg("Invalid program version.")]
    InvalidVersion,
    #[msg("Unauthorized action.")]
    Unauthorized,
}
