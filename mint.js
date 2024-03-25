const ton = require('ton');
const tonCrypto = require('ton-crypto');
const fs = require('fs');
const { internal } = require('ton-core')
const batchWalletsPrivateKeys = (fs.readFileSync('./wallets.txt', 'utf-8')).split('\r\n');
const client = new ton.TonClient({
    endpoint: 'https://ton.access.orbs.network/44A1c0ff5Bd3F8B62C092Ab4D238bEE463E644A1/1/mainnet/toncenter-api-v2/jsonRPC',
});

async function execute_task() {
    const tasks = batchWalletsPrivateKeys.map(async (privateKey) => {
        inscribe(privateKey);
    });
    await Promise.all(tasks);
}
async function inscribe(privateKey) {
    let inscribed = 0;
    let count = 9999999
    while (inscribed < count) {
        try {
            let keyPair = await tonCrypto.mnemonicToPrivateKey(privateKey.split(' '));
            let wallet = ton.WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
            let address = wallet.address.toString()
            let contract = client.open(wallet);
            let balance = await contract.getBalance();
            if (balance > 0n) {
                const c_balance = (parseInt(balance) / 1000000000).toFixed(2);
                let seqno = await contract.getSeqno();
                let multipleMessages = [];
                for (let i = 0; i < 4; i++) {
                    let intMessage = internal({
                        to: address,
                        value: '0',
                        bounce: true,
                        body: 'data:application/json,{"p":"ton-20","op":"mint","tick":"TOL","amt":"100000000000"}'
                    });
                    multipleMessages.push(intMessage);
                }
                const transferTx = contract.createTransfer({
                    seqno,
                    secretKey: Buffer.from(keyPair.secretKey),
                    messages: multipleMessages
                });
                await contract.send(transferTx);
                console.log(`${wallet.address.toString()} | [${inscribed + 1}/${count}] | ${c_balance} TON | Seqno: ${seqno} | Tx sent....`)
                inscribed++;
            }else{
                console.error('balance < 0')
                return
            }
        } catch (error) {
            console.error(`${error.message}`);
        }
    }
}
execute_task()