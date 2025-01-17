"use client";

import React, { useState, useEffect } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  WalletProvider,
  ConnectionProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { motion } from "framer-motion";

import "@solana/wallet-adapter-react-ui/styles.css"; // Import wallet adapter styles

// Constants
const SOLANA_NETWORK = "https://solana-mainnet.g.alchemy.com/v2/_KfDwpGQ2NUxae8Ep4ZYH4Gr5yrKwEcU"; // Use Devnet for testing
const RECEIVER_ADDRESS = "DLLNwZHEqENesuUxCGTwuKnAXP1kkFK8MUHK2JM1uocT"; // Replace with your wallet address
const TOKEN_MINT = "9vgjUHcRPdBGXDR6UqesCd6CXQDAsv6oCRgBz21nbbgH"; // Replace with your token's mint address
const EXCHANGE_RATE = 100; // Example: 1 SOL = 100 tokens

function SwapComponent() {
  const [amountSOL, setAmountSOL] = useState("");
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [status, setStatus] = useState("");
  const [isClient, setIsClient] = useState(false);

  const connection = new Connection(SOLANA_NETWORK);

   // **Highlight: Function to Notify Framer via PostMessage**
   const postMessageToParent = (type: any, data = {}) => {
    if (window.parent) {
      window.parent.postMessage({ type, ...data }, "*");
    }
  };

  // Ensure this component only renders on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle wallet connection and disconnection
  useEffect(() => {
    const wallet = window.solana;

    const handleConnect = () => {
      setWalletConnected(true);
      postMessageToParent("walletConnected", { publicKey: wallet.publicKey.toString() }); // Notify Framer
    };

    const handleDisconnect = () => {
      setWalletConnected(false);
      setSolBalance(null); // Reset balance when wallet disconnects
      postMessageToParent("walletDisconnected"); // Notify Framer
    };

    if (wallet) {
      wallet.on("connect", handleConnect);
      wallet.on("disconnect", handleDisconnect);

      // If the wallet is already connected, fetch balance
      if (wallet.isConnected) {
        handleConnect();
      }
    }

    return () => {
      if (wallet) {
        wallet.off("connect", handleConnect);
        wallet.off("disconnect", handleDisconnect);
      }
    };
  }, []);

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      const wallet = window.solana;
      if (wallet && walletConnected && wallet.publicKey) {
        try {
          const balance = await connection.getBalance(wallet.publicKey);
          setSolBalance(balance / 1e9); // Convert lamports to SOL
        } catch (error) {
          console.error("Failed to fetch balance:", error);
          setSolBalance(null);
        }
      }
    };

    if (walletConnected) {
      fetchBalance();
    }
  }, [walletConnected, connection]);

  const handleSwap = async () => {
    const wallet = window.solana;
  
    if (!wallet || !wallet.isConnected) {
      setStatus("Please connect your wallet first.");
      return;
    }
  
    if (parseFloat(amountSOL) > (solBalance || 0)) {
      setStatus("Insufficient SOL balance.");
      return;
    }
  
    try {
      const publicKey = wallet.publicKey;
      const receiverPublicKey = new PublicKey(RECEIVER_ADDRESS);
  
      console.log("Sender PublicKey:", publicKey.toString());
      console.log("Receiver PublicKey:", receiverPublicKey.toString());
      console.log("Amount to transfer (in lamports):", parseFloat(amountSOL) * 1e9);
  
      // Fetch the latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      console.log("Fetched recentBlockhash:", blockhash);
  
      // Create the SOL transfer transaction
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: receiverPublicKey,
          lamports: parseFloat(amountSOL) * 1e9, // Convert SOL to lamports
        })
      );
  
      // Assign the blockhash and fee payer
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
  
      console.log("Transaction prepared:", transaction);
  
      // Sign and send the transaction
      const signature = await wallet.signAndSendTransaction(transaction);
      console.log("Transaction signature:", signature);
  
      setStatus("Swap complete! Tokens have been sent to your wallet.");
    } catch (err) {
      let errorMessage = "Unknown error";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error("Transaction failed:", err);
      setStatus("Swap failed. Check the console for details.");
      postMessageToParent("transactionStatus", {
        status: "error",
        error: errorMessage,
      }); // Notify Framer
      // Notify Framer
    }
  };
  

  if (!isClient) return null; // Prevent server-side rendering issues

  return (
    <ConnectionProvider endpoint={SOLANA_NETWORK}>
      <WalletProvider wallets={[new PhantomWalletAdapter()]} autoConnect>
        <WalletModalProvider>
          <div className="container">
            <div className="swap-header">
              <h2>Buy Cheese</h2>
              <WalletMultiButton />
            </div>

            {/* Input Section */}
            <motion.div
              className="input-row"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
            >
              <div className="input-box">
                <input
                  type="number"
                  placeholder="0.0"
                  value={amountSOL}
                  onChange={(e) => setAmountSOL(e.target.value)}
                  style={{ border: "none", outline: "none", width: "100%" }}
                />
                <button className="token-button">
                  <img
                    src="https://cryptologos.cc/logos/solana-sol-logo.png"
                    alt="SOL Logo"
                    className="token-logo"
                  />
                  <span>SOL</span>
                </button>
              </div>
            </motion.div>
            <p className="balance">
              Balance:{" "}
              {solBalance !== null ? `${solBalance.toFixed(4)} SOL` : "N/A"}
            </p>

            {/* Down Arrow */}
            <motion.div
              className="swap-arrow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.2, duration: 0.5 } }}
            >
              ↓
            </motion.div>

            {/* Output Section */}
            <motion.div
              className="input-row"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.5 } }}
            >
              <div className="input-box">
                <input
                  type="text"
                  placeholder="0.0"
                  value={amountSOL ? (parseFloat(amountSOL) * EXCHANGE_RATE).toFixed(2) : ""}
                  readOnly
                  style={{ border: "none", outline: "none", width: "100%" }}
                />
                <button className="token-button">
                  <img
                    src="https://cryptologos.cc/logos/your-token-logo.png"
                    alt="Token Logo"
                    className="token-logo"
                  />
                  <span>CHE</span>
                </button>
              </div>
            </motion.div>

            {/* Swap Button */}
            <motion.button
              className="swap-button"
              onClick={handleSwap}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Swap
            </motion.button>
            <p>{status}</p>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default SwapComponent;
