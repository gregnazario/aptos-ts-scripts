import {
    AccountAddress,
    Aptos,
    AptosConfig,
    Ed25519PublicKey,
    EntryFunctionABI,
    Network,
    parseTypeTag, TypeTagAddress, TypeTagU64
} from "@aptos-labs/ts-sdk";

// Public key used for simulation of the account
const publicKey = new Ed25519PublicKey("0xd469590d7aca8202c41a838e1c4bf078b8352e2a2660b10dd5ff3c433238ed7c");
// Address of the account holding the USDT
const accountAddress = AccountAddress.from("0xf443d43c1ae0fcf75574eedee26d9448dc5cc72f45e62a65a9781a717395e505");

// On-chain address of USDT
const usdtAddress = AccountAddress.from("0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b");

// A receiver that already has USDT
const knownReceiver = AccountAddress.from("0xf98f6ac5988c1b67a18c52ee743765d9560e7bf214e6fab5dff7aaef36de11eb");
// A receiver that does not already have USDT
const unknownReceiver = AccountAddress.from("0x4444444444444444444444444444444444444444444444444444444444444444");

const aptos = new Aptos(new AptosConfig({network: Network.MAINNET}));

// Note: This is not required, but it does reduce network calls
const faTransferAbi: EntryFunctionABI = {
    typeParameters: [{constraints: []}],
    parameters: [parseTypeTag("0x1::object::Object"), new TypeTagAddress(), new TypeTagU64()],
};

// Simulates a fungible asset transfer for USDT
async function simulateTransfer(sender: AccountAddress, receiver: AccountAddress, amount: number) {
    const txn = await aptos.transaction.build.simple({
        sender: sender,
        data: {
            function: "0x1::primary_fungible_store::transfer",
            typeArguments: ["0x1::fungible_asset::Metadata"],
            functionArguments: [usdtAddress, receiver, amount],
            abi: faTransferAbi
        },
        options: {
            maxGasAmount: 1000000, // This is just for convenience, not necessary
            expireTimestamp: 100000000000000, // Far off in the future
        }
    });

    // Simulate the transaction, estimating gas unit price and gas amount
    const [response] = await aptos.transaction.simulate.simple({
        signerPublicKey: publicKey,
        transaction: txn,
        options: {
            estimateGasUnitPrice: true,
            estimateMaxGasAmount: true,
        }
    });

    return response;
}

/**
 * An interface to hold the prices for both known and unknown receivers
 *
 * Prices are in APT, to get a USD value, you would need to multiple against the current APT price
 *
 * knownPrice is for a receiver that already has USDT.  This does not require creating new storage for the receiver.
 * unknownPrice is for a receiver that does not already have USDT.  This requires creating new storage for the receiver.
 */
interface Prices {
    knownPrice: number;
    unknownPrice: number;
}

async function getBothScenarios(): Promise<Prices> {
    const known = await simulateTransfer(accountAddress, knownReceiver, 0);
    if (!known.success) {
        throw new Error("Transfer simulation failed");
    }
    const knownPrice = BigInt(known.gas_used) * BigInt(known.gas_unit_price);
    const unknown = await simulateTransfer(accountAddress, unknownReceiver, 0);
    if (!unknown.success) {
        throw new Error("Transfer simulation failed");
    }
    const unknownPrice = BigInt(unknown.gas_used) * BigInt(unknown.gas_unit_price);

    const octasDivisor = 10 ** 8;

    // TODO: If necessary, we can add storage cost for gas as a separate field
    // Find storage gas cost
    const knownFeeStatement = known.events.find((event) => event.type === "0x1::transaction_fee::FeeStatement")?.data?.storage_fee_octas
    const unknownFeeStatement = unknown.events.find((event) => event.type === "0x1::transaction_fee::FeeStatement")?.data?.storage_fee_octas

    return {
        knownPrice: Number(knownPrice) / octasDivisor,
        unknownPrice: Number(unknownPrice) / octasDivisor,
    }
}

getBothScenarios().then((prices) => {
    console.log(prices);
}).catch((e) => {
    console.error(e);
});