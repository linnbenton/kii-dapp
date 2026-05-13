"use client";

import { ethers } from "ethers";
import { useState, useEffect, useCallback } from "react";
import { contractAddress, abi } from "../constants";

const KII_CHAIN_ID = "0x538";

const KII_CHAIN_CONFIG = {
  chainId: KII_CHAIN_ID,
  chainName: "KiiChain Testnet V3",
  nativeCurrency: {
    name: "KII",
    symbol: "KII",
    decimals: 18,
  },
  rpcUrls: ["https://json-rpc.uno.sentry.testnet.v3.kiivalidator.com/"],
  blockExplorerUrls: ["https://explorer.kiichain.io"],
};

const RPC_URL = "https://json-rpc.uno.sentry.testnet.v3.kiivalidator.com/";

const EXPLORER_URL = "https://explorer.kiichain.io/tx/";

export default function Home() {
  // ------------------------------------------------------------------
  // STATES
  // ------------------------------------------------------------------

  const [hasEntered, setHasEntered] = useState(false);
  const [count, setCount] = useState("0");
  const [balance, setBalance] = useState("0.0000");
  const [loading, setLoading] = useState(false);

  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState("");

  const [lastTxHash, setLastTxHash] = useState("");
  const [wrongNetwork, setWrongNetwork] = useState(false);

  // ------------------------------------------------------------------
  // THEME
  // ------------------------------------------------------------------

  const colors = {
    background:
      "bg-[radial-gradient(circle_at_top,#312e81_0%,#14051f_45%,#09090b_100%)]",

    card: "bg-[linear-gradient(135deg,rgba(91,33,182,0.25)_0%,rgba(37,99,235,0.18)_100%)]",

    border: "border-purple-400/20",

    primary: "#c084fc",
    secondary: "#60a5fa",

    glow: "shadow-[0_0_60px_rgba(168,85,247,0.18)]",

    button: "bg-[linear-gradient(90deg,#7e22ce_0%,#4f46e5_50%,#2563eb_100%)]",

    buttonHover: "hover:shadow-[0_0_30px_rgba(168,85,247,0.45)]",
  };

  // ------------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------------

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // ------------------------------------------------------------------
  // CHECK NETWORK
  // ------------------------------------------------------------------

  const checkNetwork = async () => {
    if (!window.ethereum) return;

    try {
      const chainId = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;

      setWrongNetwork(chainId !== KII_CHAIN_ID);
    } catch (error) {
      console.error("Failed to check network:", error);
    }
  };

  // ------------------------------------------------------------------
  // FETCH COUNT
  // ------------------------------------------------------------------

  const fetchCount = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
    } catch (error) {
      console.error("Fetch count error:", error);
    }
  }, []);

  // ------------------------------------------------------------------
  // FETCH USER DATA
  // ------------------------------------------------------------------

  const fetchUserData = useCallback(async (address: string) => {
    if (!window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Balance
      const rawBalance = await provider.getBalance(address);

      setBalance(parseFloat(ethers.formatEther(rawBalance)).toFixed(4));

      // Counter
      const contract = new ethers.Contract(contractAddress, abi, provider);

      const currentCount = await contract.getCount();

      setCount(currentCount.toString());
    } catch (error) {
      console.error("Fetch user data error:", error);
    }
  }, []);

  // ------------------------------------------------------------------
  // CHECK CONNECTION
  // ------------------------------------------------------------------

  const checkConnection = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      // Check current network
      await checkNetwork();

      // Get connected accounts
      const accounts = (await window.ethereum.request({
        method: "eth_accounts",
      })) as string[];

      if (accounts.length === 0) return;

      const address = accounts[0];

      setWalletConnected(true);
      setUserAddress(address);

      await fetchUserData(address);
    } catch (error) {
      console.error("Wallet connection check failed:", error);
    }
  }, [fetchUserData]);

  // ------------------------------------------------------------------
  // SWITCH TO KIICHAIN
  // ------------------------------------------------------------------

  const switchToKiiChain = async () => {
    if (!window.ethereum) return;

    try {
      // Switch existing chain
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: KII_CHAIN_ID }],
      });

      setWrongNetwork(false);
    } catch (error: unknown) {
      const switchError = error as {
        code?: number;
      };

      // Chain not added yet
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [KII_CHAIN_CONFIG],
          });

          setWrongNetwork(false);
        } catch (addError) {
          console.error("Failed to add KiiChain network:", addError);
        }

        return;
      }

      console.error("Failed to switch network:", switchError);
    }
  };

  // ------------------------------------------------------------------
  // CONNECT WALLET
  // ------------------------------------------------------------------

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask.");
      return;
    }

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      await checkNetwork();

      if (accounts.length === 0) return;

      const address = accounts[0];

      setWalletConnected(true);
      setUserAddress(address);

      await fetchUserData(address);
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  // ------------------------------------------------------------------
  // DISCONNECT
  // ------------------------------------------------------------------

  const disconnectWallet = () => {
    setWalletConnected(false);
    setUserAddress("");

    setBalance("0.0000");
    setLastTxHash("");
  };

  // ------------------------------------------------------------------
  // INCREMENT
  // ------------------------------------------------------------------

  const handleIncrement = async () => {
    if (!walletConnected) {
      alert("Please connect your wallet first.");
      return;
    }

    if (wrongNetwork) {
      alert("Please switch to KiiChain Testnet V3.");
      return;
    }

    setLoading(true);
    setLastTxHash("");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      const signer = await provider.getSigner();

      const contract = new ethers.Contract(contractAddress, abi, signer);

      const tx = await contract.increment();

      setLastTxHash(tx.hash);

      await tx.wait();

      await fetchUserData(userAddress);
    } catch (error) {
      console.error("Increment error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // EFFECTS
  // ------------------------------------------------------------------

  useEffect(() => {
    checkConnection();
    fetchCount();
  }, [checkConnection, fetchCount]);

  // ------------------------------------------------------------------
  // ENTRY SCREEN
  // ------------------------------------------------------------------

  if (!hasEntered) {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center overflow-hidden ${colors.background}`}
      >
        {/* Glow */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-[140px]" />

        <div className="relative z-10 text-center px-6">
          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-5 leading-none">
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
              KIICHAIN
            </span>{" "}
            <span className="bg-gradient-to-r from-fuchsia-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              ORO
            </span>
          </h1>

          <div className="space-y-3 mb-12">
            <p className="text-[#60a5fa] uppercase tracking-[0.3em] text-sm md:text-base font-mono">
              Beyond Speed, Absolute Reliability
            </p>

            <p className="text-neutral-400 text-sm max-w-md mx-auto leading-relaxed">
              Experience the next generation KiiChain onchain application
              infrastructure.
            </p>
          </div>

          <button
            onClick={() => setHasEntered(true)}
            className="group relative overflow-hidden border border-purple-500 px-10 py-4 rounded-2xl font-bold tracking-[0.25em] text-sm transition-all hover:scale-[1.02]"
          >
            <span className="relative z-10">ENTER</span>

            <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </div>

        <div className="absolute bottom-8 text-[10px] text-neutral-600 tracking-[0.3em] font-mono">
          KII TESTNET V3 • CHAIN ID 1336
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // MAIN UI
  // ------------------------------------------------------------------

  return (
    <main
      className={`min-h-screen text-white flex flex-col ${colors.background}`}
    >
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 opacity-80" />
      {/* Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[140px]" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/5 bg-black/20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setHasEntered(false)}
              className="text-2xl font-black tracking-tight"
            >
              <span style={{ color: colors.primary }}>KiiCounter</span>{" "}
              <span className="font-light text-white">PRO</span>
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />

              <span className="text-[10px] font-mono tracking-[0.2em] text-cyan-300">
                LIVE ON KIICHAIN
              </span>
            </div>
          </div>

          {walletConnected ? (
            <div className="flex items-center gap-4">
              <button
                onClick={disconnectWallet}
                className="text-[10px] uppercase tracking-[0.2em] text-red-400 hover:text-red-300"
              >
                Disconnect
              </button>

              <div className="px-4 py-2 rounded-full border border-purple-500/20 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-sm font-mono">
                {shortenAddress(userAddress)}
              </div>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className={`
  px-5 py-3 rounded-xl font-bold text-sm
  ${colors.button}
  ${colors.buttonHover}
  transition-all duration-300
  hover:scale-[1.03]
`}
            >
              CONNECT WALLET
            </button>
          )}
        </div>
      </nav>

      {/* Main Section */}
      {wrongNetwork && (
        <div className="w-full flex justify-center px-6 pt-6">
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 backdrop-blur-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-red-400 font-black tracking-wide text-sm mb-1">
                  WRONG NETWORK
                </h3>

                <p className="text-sm text-neutral-300 leading-relaxed">
                  Please switch to KiiChain Testnet V3
                </p>
              </div>

              <button
                onClick={switchToKiiChain}
                className="
            px-4 py-2 rounded-xl
            text-xs font-bold tracking-wide
            bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600
            hover:scale-[1.03]
            transition-all duration-300
            whitespace-nowrap
          "
              >
                SWITCH NETWORK
              </button>
            </div>
          </div>
        </div>
      )}
      <section className="flex-1 flex items-center justify-center px-6 py-16">
        <div
          className={`relative w-full max-w-md rounded-3xl border backdrop-blur-2xl p-8 flex flex-col items-center ${colors.card} ${colors.border} ${colors.glow}`}
        >
          {/* Terminal Dots */}
          <div className="w-full flex items-center justify-between mb-8">
            <div className="flex gap-2">
              <div className="group relative">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-red-500 blur-sm opacity-70 group-hover:opacity-100 animate-ping" />
              </div>

              <div className="group relative">
                <div
                  className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"
                  style={{ animationDelay: "0.3s" }}
                />
                <div
                  className="absolute inset-0 rounded-full bg-yellow-400 blur-sm opacity-70 group-hover:opacity-100 animate-ping"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>

              <div className="group relative">
                <div
                  className="w-3 h-3 rounded-full bg-green-400 animate-pulse"
                  style={{ animationDelay: "0.6s" }}
                />
                <div
                  className="absolute inset-0 rounded-full bg-green-400 blur-sm opacity-70 group-hover:opacity-100 animate-ping"
                  style={{ animationDelay: "0.6s" }}
                />
              </div>
            </div>

            <span className="text-[10px] text-cyan-400 tracking-[0.25em] font-mono">
              KIICHAIN TERMINAL
            </span>
          </div>

          {/* Status */}
          <div className="w-full flex items-center justify-between mb-8">
            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/10 text-[10px] tracking-[0.2em] font-mono text-purple-300">
              {walletConnected ? "STATUS • CONNECTED" : "STATUS • IDLE"}
            </div>

            <div className="text-[10px] font-mono text-neutral-300">
              BALANCE • {balance} KII
            </div>
          </div>

          {/* Counter */}
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-3">
            Network Counter
          </p>

          <div className="text-8xl font-black tracking-tight mb-10">
            {count}
          </div>

          {/* Action Button */}
          <button
            onClick={handleIncrement}
            disabled={loading || !walletConnected}
            className={`w-full py-4 rounded-2xl font-black tracking-[0.2em] transition-all duration-300
              ${
                loading || !walletConnected
                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  : `${colors.button} ${colors.buttonHover} hover:scale-[1.01]`
              }`}
          >
            {loading ? "PROCESSING TRANSACTION..." : "INCREMENT ONCHAIN"}
          </button>

          {/* Transaction */}
          {lastTxHash && (
            <div className="w-full mt-6 p-4 rounded-2xl border border-purple-500/10 bg-purple-500/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] tracking-[0.2em] text-purple-300 font-bold">
                  LATEST TRANSACTION
                </span>

                <span
                  className={`text-[10px] font-bold ${
                    loading ? "text-yellow-400" : "text-green-400"
                  }`}
                >
                  {loading ? "AWAITING FINALITY" : "FINALIZED"}
                </span>
              </div>

              <a
                href={`${EXPLORER_URL}${lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[11px] break-all text-neutral-400 hover:text-cyan-300 transition-colors font-mono"
              >
                {lastTxHash}
              </a>
            </div>
          )}

          {/* Footer Stats */}
          <div className="mt-8 flex items-center gap-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-mono">
            <div>
              Chain ID • <span className="text-purple-400">1336</span>
            </div>

            <div>
              Network • <span className="text-cyan-400">Testnet Oro</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center bg-black/20">
        <p className="text-[10px] tracking-[0.3em] text-neutral-600 font-mono">
          KII TESTNET V3 • BUILT ON KIICHAIN
        </p>
      </footer>
    </main>
  );
}
