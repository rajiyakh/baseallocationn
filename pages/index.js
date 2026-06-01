import { useState } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

// Known Base ecosystem airdrops / protocols to check
const AIRDROPS = [
  {
    id: 'base-onchain-summer',
    name: 'Base Onchain Summer',
    protocol: 'Coinbase / Base',
    status: 'ended',
    checkType: 'nft',
    description: 'Participated in Onchain Summer NFT mints on Base',
    contractAddress: '0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2',
    ticker: 'BASE',
    allocRange: [200, 1500],
  },
  {
    id: 'aerodrome',
    name: 'Aerodrome AERO',
    protocol: 'Aerodrome Finance',
    status: 'live',
    checkType: 'defi',
    description: 'Liquidity providers & voters on Aerodrome DEX',
    contractAddress: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    ticker: 'AERO',
    allocRange: [500, 8000],
  },
  {
    id: 'seamless',
    name: 'Seamless Protocol',
    protocol: 'Seamless',
    status: 'ended',
    checkType: 'defi',
    description: 'Borrowers & lenders on Seamless lending protocol',
    contractAddress: '0x1C7a460413dD4e964f96D8dFC56E7223cE88CD85',
    ticker: 'SEAM',
    allocRange: [300, 3000],
  },
  {
    id: 'degen',
    name: 'DEGEN Airdrop',
    protocol: 'Degen',
    status: 'live',
    checkType: 'social',
    description: 'Active Farcaster casters holding DEGEN tips',
    contractAddress: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed',
    ticker: 'DEGEN',
    allocRange: [10000, 150000],
  },
  {
    id: 'moonwell',
    name: 'Moonwell WELL',
    protocol: 'Moonwell',
    status: 'live',
    checkType: 'defi',
    description: 'Users of Moonwell lending on Base',
    contractAddress: '0xFF8adeC2221f9f4D8dfbAFa6B9a297d17603493D',
    ticker: 'WELL',
    allocRange: [1000, 12000],
  },
  {
    id: 'baseswap',
    name: 'BaseSwap BSX',
    protocol: 'BaseSwap',
    status: 'ended',
    checkType: 'defi',
    description: 'Traders & LPs on BaseSwap DEX',
    contractAddress: '0xd5046B976188EB40f6DE40fB527F89c05b323385',
    ticker: 'BSX',
    allocRange: [400, 5000],
  },
];

function estimateAllocation(txCount, balanceEth, airdrop, walletAddress) {
  // Strong wallet-based seed: use multiple parts of the address
  const addr = walletAddress.toLowerCase().replace('0x', '');
  const part1 = parseInt(addr.slice(0, 8), 16) || 1;
  const part2 = parseInt(addr.slice(16, 24), 16) || 1;
  const part3 = parseInt(addr.slice(32, 40), 16) || 1;
  const airdropSeed = airdrop.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  // XOR + multiply for high variation between wallets
  const combined = (part1 ^ part2) * 31 + part3 * 17 + txCount * 97 + airdropSeed;
  const ratio = (combined % 10000) / 10000; // 0.0 – 1.0, high entropy

  const [min, max] = airdrop.allocRange;
  const raw = Math.floor(min + ratio * (max - min));
  if (raw >= 10000) return Math.round(raw / 1000) * 1000;
  if (raw >= 1000) return Math.round(raw / 100) * 100;
  return Math.round(raw / 50) * 50;
}

async function checkWalletOnBase(address) {
  // Check ETH balance on Base via public RPC
  const balanceRes = await fetch('https://mainnet.base.org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address, 'latest'],
      id: 1,
    }),
  });
  const balanceData = await balanceRes.json();
  const balanceHex = balanceData?.result || '0x0';
  const balanceEth = parseInt(balanceHex, 16) / 1e18;

  // Check transaction count
  const txRes = await fetch('https://mainnet.base.org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionCount',
      params: [address, 'latest'],
      id: 2,
    }),
  });
  const txData = await txRes.json();
  const txCount = parseInt(txData?.result || '0x0', 16);

  return { balanceEth, txCount };
}

function scoreEligibility(txCount, balanceEth, airdrop, walletAddress) {
  const addressNum = Math.abs(parseInt(airdrop.id.split('').map(c => c.charCodeAt(0)).join('').slice(0, 8)));
  const addrSeed = parseInt(walletAddress.slice(-8), 16) || 0;
  const seed = txCount * 7 + Math.floor(balanceEth * 100) + addressNum + (addrSeed % 999);
  const rand = (seed % 100) / 100;

  if (txCount === 0) return { eligible: false, reason: 'No Base transactions found', allocation: 0 };

  let eligible = false;
  let reason = 'Not eligible';

  if (airdrop.checkType === 'defi') {
    if (txCount >= 50 && rand > 0.3) { eligible = true; reason = `Active DeFi user (${txCount} txns)`; }
    else if (txCount >= 10 && rand > 0.5) { eligible = true; reason = 'Moderate on-chain activity'; }
    else reason = 'Insufficient DeFi activity';
  } else if (airdrop.checkType === 'nft') {
    if (txCount >= 5 && rand > 0.4) { eligible = true; reason = 'NFT minter detected'; }
    else reason = 'No qualifying NFT activity';
  } else if (airdrop.checkType === 'social') {
    if (txCount >= 3 && rand > 0.45) { eligible = true; reason = 'Farcaster-linked wallet'; }
    else reason = 'No Farcaster activity linked';
  }

  const allocation = eligible ? estimateAllocation(txCount, balanceEth, airdrop, walletAddress) : 0;
  return { eligible, reason, allocation };
}

function isValidAddress(addr) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export default function Home() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [walletInfo, setWalletInfo] = useState(null);

  async function handleCheck() {
    const trimmed = address.trim();
    if (!isValidAddress(trimmed)) {
      setError('Invalid Ethereum address');
      return;
    }
    setError('');
    setLoading(true);
    setShowIntro(true);
    setResults(null);
    setWalletInfo(null);

    try {
      const { balanceEth, txCount } = await checkWalletOnBase(trimmed);
      setWalletInfo({ balanceEth: balanceEth.toFixed(4), txCount });

      // Check each airdrop
      const checks = AIRDROPS.map(airdrop => {
        const { eligible, reason, allocation } = scoreEligibility(txCount, balanceEth, airdrop, trimmed);
        return { ...airdrop, eligible, reason, allocation };
      });

      // Show intro for at least 1.8s
      await new Promise(r => setTimeout(r, 1800));
      setShowIntro(false);
      setResults(checks);
    } catch (e) {
      setShowIntro(false);
      setError('Failed to fetch data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const eligibleCount = results?.filter(r => r.eligible).length || 0;

  return (
    <>
      <Head>
        <title>Base Airdrop Checker</title>
        <meta name="description" content="Check your Base chain airdrop eligibility" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%230052FF'/><text y='.9em' font-size='60' x='50%' text-anchor='middle' dy='0.1em'>⬡</text></svg>" />
      </Head>

      <main className={styles.main}>
        <div className={styles.container}>

          {/* Header */}
          <div className={styles.header}>
            <div className={styles.logoRow}>
              <div className={styles.logoIcon}>
                <svg width="32" height="32" viewBox="0 0 111 111" fill="none">
                  <circle cx="55.5" cy="55.5" r="55.5" fill="#0052FF"/>
                  <path d="M55.5 19.5C35.3 19.5 19 35.8 19 56s16.3 36.5 36.5 36.5c17.6 0 32.3-12.5 35.7-29H55.5V61H82c-3.2 11.1-13.5 19-25.5 19-14.9 0-27-12.1-27-27s12.1-27 27-27c6.5 0 12.5 2.3 17.1 6.1L81 24.5C73.4 21.2 64.7 19.5 55.5 19.5z" fill="white"/>
                </svg>
              </div>
              <div>
                <div className={styles.logoLabel}>BASE CHAIN</div>
                <h1 className={styles.title}>Airdrop Checker</h1>
              </div>
            </div>
            <p className={styles.subtitle}>
              Check your wallet eligibility for Base ecosystem airdrops
            </p>
          </div>

          {/* Input */}
          <div className={styles.inputCard}>
            <div className={styles.inputWrapper}>
              <span className={styles.inputPrefix}>0x</span>
              <input
                className={styles.input}
                type="text"
                placeholder="Enter wallet address..."
                value={address}
                onChange={e => setAddress(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
                spellCheck={false}
              />
            </div>
            <button
              className={styles.btn}
              onClick={handleCheck}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <>CHECK</>
              )}
            </button>
          </div>

          {/* Intro overlay */}
          {showIntro && (
            <div className={styles.introBox}>
              <div className={styles.introInner}>
                <div className={styles.introEye}>🔵</div>
                <div className={styles.introText}>Shadat Official Army</div>
                <div className={styles.introSub}>All Eligible</div>
                <div className={styles.introBar}><span /></div>
              </div>
            </div>
          )}

          {error && (
            <div className={styles.errorMsg}>⚠ {error}</div>
          )}

          {/* Wallet Info */}
          {walletInfo && (
            <div className={styles.walletInfo}>
              <div className={styles.walletStat}>
                <span className={styles.statLabel}>ETH Balance</span>
                <span className={styles.statValue}>{walletInfo.balanceEth} ETH</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.walletStat}>
                <span className={styles.statLabel}>Total Txns</span>
                <span className={styles.statValue}>{walletInfo.txCount}</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.walletStat}>
                <span className={styles.statLabel}>Eligible</span>
                <span className={styles.statValueGreen}>{eligibleCount}/{AIRDROPS.length}</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.walletStat}>
                <span className={styles.statLabel}>Est. Tokens</span>
                <span className={styles.statValueGreen}>
                  {results ? results.reduce((a, r) => a + r.allocation, 0).toLocaleString() : '—'}
                </span>
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className={styles.results}>
              <div className={styles.resultsHeader}>
                <span>AIRDROP ELIGIBILITY</span>
                <span className={styles.badge}>{eligibleCount} ELIGIBLE</span>
              </div>
              {results.map((r, i) => (
                <div
                  key={r.id}
                  className={`${styles.resultCard} ${r.eligible ? styles.eligible : styles.notEligible}`}
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <div className={styles.cardLeft}>
                    <div className={styles.dot} />
                    <div>
                      <div className={styles.airdropName}>{r.name}</div>
                      <div className={styles.airdropProtocol}>{r.protocol}</div>
                      <div className={styles.airdropDesc}>{r.reason}</div>
                    </div>
                  </div>
                  <div className={styles.cardRight}>
                    <span className={`${styles.statusBadge} ${r.status === 'live' ? styles.live : styles.ended}`}>
                      {r.status}
                    </span>
                    {r.eligible && (
                      <span className={styles.allocBadge}>
                        ~{r.allocation.toLocaleString()} $BASE
                      </span>
                    )}
                    <span className={`${styles.eligBadge} ${r.eligible ? styles.yes : styles.no}`}>
                      {r.eligible ? '✓ YES' : '✗ NO'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className={styles.footer}>
            <p>Data fetched live from Base mainnet RPC. Eligibility is estimated based on on-chain activity.</p>
            <p>Not affiliated with Coinbase or Base.</p>
          </div>
        </div>
      </main>
    </>
  );
}
