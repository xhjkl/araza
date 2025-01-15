/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/araza.json`.
 */
export type Araza = {
  "address": "AnymAL5sjUsgFVFabV2bs1cbMKVT45dcGHCaCUJB4RDg",
  "metadata": {
    "name": "araza",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "configure",
      "discriminator": [
        245,
        7,
        108,
        117,
        95,
        196,
        54,
        217
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "Who made the call"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "docs": [
            "Internal state of the program"
          ],
          "writable": true,
          "pda": {
            "seeds": []
          }
        },
        {
          "name": "usdcMint",
          "docs": [
            "Remembering the mint of the USDC tokens",
            "to make sure we only accept real USDC tokens in the subsequent instructions."
          ]
        },
        {
          "name": "usdcVault",
          "docs": [
            "Where we store the USDC tokens given to us by the users"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  47,
                  117,
                  115,
                  100,
                  99
                ]
              }
            ]
          }
        },
        {
          "name": "ddMint",
          "docs": [
            "The mint of the DD tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  47,
                  100,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL token program"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "deposit",
      "docs": [
        "Deposit USDC and mint Digital Dollars (DD)"
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "state",
          "pda": {
            "seeds": []
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "fromAccount",
          "writable": true
        },
        {
          "name": "toAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "ddMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  47,
                  117,
                  115,
                  100,
                  99
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "ddMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  47,
                  100,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "Who made the call"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "docs": [
            "Internal state of the program"
          ],
          "writable": true,
          "pda": {
            "seeds": []
          }
        },
        {
          "name": "treasurer",
          "docs": [
            "And we only need the public key from it to store it in the program state.",
            "",
            "This is the account that can call `release_funds`, normally the daemon."
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "offerDd",
      "docs": [
        "Offer DD for fiat exchange",
        "",
        "This will create an escrow account for the user's DD tokens,",
        "and transfer those to the escrow.",
        "",
        "The daemon will then choose the best offer for the user,",
        "and release the funds to the beneficiary,",
        "after both ends of the deal are settled."
      ],
      "discriminator": [
        153,
        48,
        137,
        99,
        44,
        17,
        238,
        56
      ],
      "accounts": [
        {
          "name": "state",
          "pda": {
            "seeds": []
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "fromAccount",
          "writable": true
        },
        {
          "name": "ddMint",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  47,
                  100,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "offerFiat",
      "docs": [
        "Offer fiat for DD exchange",
        "",
        "This is an extension point for when we want to advertise all the fiat offers on chain."
      ],
      "discriminator": [
        236,
        30,
        78,
        153,
        227,
        82,
        116,
        197
      ],
      "accounts": [
        {
          "name": "state",
          "pda": {
            "seeds": []
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "redeem",
      "docs": [
        "Redeem DD to receive USDC"
      ],
      "discriminator": [
        184,
        12,
        86,
        149,
        70,
        196,
        97,
        225
      ],
      "accounts": [
        {
          "name": "state",
          "pda": {
            "seeds": []
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "fromAccount",
          "writable": true
        },
        {
          "name": "toAccount",
          "writable": true
        },
        {
          "name": "usdcVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  47,
                  117,
                  115,
                  100,
                  99
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "ddMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  47,
                  100,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "releaseFunds",
      "docs": [
        "Execute the escrow, assuming the associated deal is fully settled"
      ],
      "discriminator": [
        225,
        88,
        91,
        108,
        126,
        52,
        2,
        26
      ],
      "accounts": [
        {
          "name": "state",
          "pda": {
            "seeds": []
          }
        },
        {
          "name": "treasurer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user"
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "beneficiary",
          "writable": true
        },
        {
          "name": "ddMint",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  47,
                  100,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "programState",
      "discriminator": [
        77,
        209,
        137,
        229,
        149,
        67,
        167,
        230
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidVersion",
      "msg": "Invalid program version."
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "Unauthorized action."
    }
  ],
  "types": [
    {
      "name": "programState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "docs": [
              "Version of the program",
              "",
              "That way the program will refuse to work",
              "until `initialize` is called by the upgrade authority."
            ],
            "type": "u8"
          },
          {
            "name": "treasurer",
            "docs": [
              "The account that can call `release_funds`"
            ],
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "docs": [
              "The mint of the USDC tokens"
            ],
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
