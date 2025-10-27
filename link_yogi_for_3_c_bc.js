import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import fs from "fs";
import os from "os";
import path from "path";

// === SETTINGS ===
const MINT_ADDRESS = "8ovoXzA8a4H1gVx9Va7S5MQtK6JQJJt86RGaNyW5YQAg";
const METADATA_URL = "https://ym747.github.io/yogi-token/metadata.json";
const KEYPAIR_PATH = path.join(os.homedir(), ".config", "solana", "id.json");
const EXPECTED_WALLET = "3cBcLavcRyX4XwxpMnyzZQQtW3DxHdt1Wp1fSJSRor1A";
const MIN_BALANCE_SOL = 0.01; // minimum SOL required to attempt tx
// =================

async function main() {
  try {
    // Load wallet
    const secretKey = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8"));
    const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));

    console.log("Wallet:", payer.publicKey.toBase58());

    // Verify wallet
    if (payer.publicKey.toBase58() !== EXPECTED_WALLET) {
      console.error(`ERROR: This script must be run with wallet ${EXPECTED_WALLET}`);
      return;
    }

    // Setup connection & Metaplex
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const metaplex = Metaplex.make(connection).use(keypairIdentity(payer));
    const mint = new PublicKey(MINT_ADDRESS);

    console.log("Linking YOGI Token metadata...");
    console.log("Mint:  ", mint.toBase58());

    // Check balance first to avoid send errors
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`Balance: ${balance / 1e9} SOL`);
    if (balance < MIN_BALANCE_SOL * 1e9) {
      console.error(`ERROR: Insufficient balance. Need at least ${MIN_BALANCE_SOL} SOL on Devnet to create/update metadata.`);
      console.error("Use: solana airdrop 2 --url https://api.devnet.solana.com or solana airdrop 2");
      return;
    }

    // Try to find existing NFT metadata
    try {
      const nft = await metaplex.nfts().findByMint({ mintAddress: mint });

      // Metadata exists → update it
      await metaplex.nfts().update({
        nftOrSft: nft,
        uri: METADATA_URL,
        name: "YOGI Token",
        symbol: "YOGI",
        sellerFeeBasisPoints: 0,
      });

      console.log("SUCCESS! Metadata updated.");

    } catch (err) {
      // If metadata not found, create it
      if (err.name === "AccountNotFoundError" || (err.message && err.message.includes("Metadata"))) {
        console.log("Metadata not found, creating new metadata...");
        try {
          const res = await metaplex.nfts().create({
            mint,
            uri: METADATA_URL,
            name: "YOGI Token",
            symbol: "YOGI",
            sellerFeeBasisPoints: 0,
            isMutable: true,
            payer,
          });
          console.log("Metadata CREATED!", res?.nft?.address?.toBase58?.() ?? "");
        } catch (createErr) {
          console.error("FailedToSendTransactionError or create error:", createErr?.cause ?? createErr);
          if (createErr?.cause?.transactionLogs) console.error("Logs:", createErr.cause.transactionLogs);
        }
      } else {
        console.error("Error:", err);
      }
    }

    console.log("\nView your token:");
    console.log(`https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`);

  } catch (err) {
    console.error("Fatal error:", err);
  }
}

main();