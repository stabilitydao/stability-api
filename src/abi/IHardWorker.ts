export default [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "alreadyExcludedObject",
          "type": "address"
        }
      ],
      "name": "AlreadyExclude",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotEnoughETH",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "notExistObject",
          "type": "address"
        }
      ],
      "name": "NotExistWithObject",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotServerOrGelato",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "hardworks",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "gasUsed",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "gasCost",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "server",
          "type": "bool"
        }
      ],
      "name": "Call",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "oldSender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "newSender",
          "type": "address"
        }
      ],
      "name": "DedicatedGelatoMsgSender",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "allowed",
          "type": "bool"
        }
      ],
      "name": "DedicatedServerMsgSender",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "delayServer",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "delayGelato",
          "type": "uint256"
        }
      ],
      "name": "Delays",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "GelatoDeposit",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "id",
          "type": "bytes32"
        }
      ],
      "name": "GelatoTask",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "maxHwPerCall_",
          "type": "uint256"
        }
      ],
      "name": "MaxHwPerCall",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "vault",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "status",
          "type": "bool"
        }
      ],
      "name": "VaultExcludeStatusChanged",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address[]",
          "name": "vaults",
          "type": "address[]"
        }
      ],
      "name": "call",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address[]",
          "name": "vaults_",
          "type": "address[]"
        },
        {
          "internalType": "bool[]",
          "name": "status",
          "type": "bool[]"
        }
      ],
      "name": "changeVaultExcludeStatus",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "checkerGelato",
      "outputs": [
        {
          "internalType": "bool",
          "name": "canExec",
          "type": "bool"
        },
        {
          "internalType": "bytes",
          "name": "execPayload",
          "type": "bytes"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "checkerServer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "canExec",
          "type": "bool"
        },
        {
          "internalType": "bytes",
          "name": "execPayload",
          "type": "bytes"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "dedicatedGelatoMsgSender",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "dedicatedServerMsgSender",
      "outputs": [
        {
          "internalType": "bool",
          "name": "allowed",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "vault",
          "type": "address"
        }
      ],
      "name": "excludedVaults",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "gelatoBalance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "gelatoMinBalance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "gelatoTaskId",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getDelays",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "delayServer",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "delayGelato",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "maxHwPerCall",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "allowed",
          "type": "bool"
        }
      ],
      "name": "setDedicatedServerMsgSender",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "delayServer_",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "delayGelato_",
          "type": "uint256"
        }
      ],
      "name": "setDelays",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "maxHwPerCall_",
          "type": "uint256"
        }
      ],
      "name": "setMaxHwPerCall",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
  