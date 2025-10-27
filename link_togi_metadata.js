import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import fs from "fs";

// === SETTINGS ===
const MINT_ADDRESS = "34G3jKGHaUm28SV21HMmojH8KNwZZedJsQqVXMLEVtXf";
const METADATA_URL = "https://ym747.github.io/yogi-token/metadata.json"; // your metadata link
const KEYPAIR_PATH = "C:/Users/HP/.config/solana/togi_wallet.json";
const MIN_BALANCE_SOL = 0.01; // minimum SOL required to attempt tx
// =================

async function main() {
  try {
    // Load wallet
    const secretKey = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8"));
    const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));

    console.log("Wallet:", payer.publicKey.toBase58());

    // Setup connection & Metaplex
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const metaplex = Metaplex.make(connection).use(keypairIdentity(payer));
    const mint = new PublicKey(MINT_ADDRESS);

    console.log("Linking TOGI Token metadata...");
    console.log("Mint:  ", mint.toBase58());

    // Check balance first to avoid send errors
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`Balance: ${balance / 1e9} SOL`);
    if (balance < MIN_BALANCE_SOL * 1e9) {
      console.error(`ERROR: Insufficient balance. Need at least ${MIN_BALANCE_SOL} SOL on Devnet.`);
      return;
    }

    // Try to find existing NFT metadata
    try {
      const nft = await metaplex.nfts().findByMint({ mintAddress: mint });

      // Metadata exists → update it
      await metaplex.nfts().update({
        nftOrSft: nft,
        uri: METADATA_URL,
        name: "TOGI Token",
        symbol: "TOGI",
        sellerFeeBasisPoints: 0,
      });

      console.log("SUCCESS! Metadata updated.");

    } catch (err) {
      // If metadata not found, create it
      if (err.name === "AccountNotFoundError" || (err.message && err.message.includes("Metadata"))) {
        console.log("Metadata not found, creating new metadata...");
        const res = await metaplex.nfts().create({
          mint,
          uri: METADATA_URL,
          name: "TOGI Token",
          symbol: "TOGI",
          sellerFeeBasisPoints: 0,
          isMutable: true,
          payer,
        });
        console.log("Metadata CREATED!", res?.nft?.address?.toBase58?.() ?? "");
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
