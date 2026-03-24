import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, phantomWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { polygon } from 'wagmi/chains';

const connectors = connectorsForWallets(
    [
        {
            groupName: 'Supported Wallets',
            wallets: [metaMaskWallet, phantomWallet],
        },
    ],
    {
        appName: 'PMXT',
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'YOUR_PROJECT_ID',
    },
);

export const config = createConfig({
    connectors,
    chains: [polygon],
    transports: {
        [polygon.id]: http(),
    },
    ssr: true,
});
