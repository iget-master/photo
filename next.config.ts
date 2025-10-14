// next.config.js
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'picsum.photos' },
            { protocol: 'https', hostname: 'sbiw4rrjq2xtu9aa.public.blob.vercel-storage.com' }
        ],
    },
};
module.exports = nextConfig;
