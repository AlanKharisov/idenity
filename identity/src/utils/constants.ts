export const DEMO_POSTS = [
    {
        id: 1,
        userId: 1,
        userName: "Olera Sydorenko",
        userAvatar: "/img/056026b6db13070cbe45543d3d1ef857.png",
        nftImage: "/img/4b66197f9eb7e0792df1f70079064ea2dc357fc6.jpg",
        title: "Sound Legacy-NFT",
        description: "Sound Legacy - A melody that will belong only to you, forever protected by blockchain.",
        tags: ["MusicNFT", "Blockchain", "DigitalOwnership"],
        likes: 124,
        liked: false,
        comments: [],
        createdAt: new Date().toISOString(),
    },
    {
        id: 2,
        userId: 2,
        userName: "Bohdan Shevchenko",
        userAvatar: "/img/9a7f219211dd83fedb08d30580f72b891e9efc04.jpg",
        nftImage: "/img/056026b6db13070cbe45543d3d1ef857.png",
        title: "Symbolic of Strength",
        description: "This NFT represents the strength and resilience of the human spirit in digital form.",
        tags: ["ArtNFT", "Symbolism", "Strength"],
        likes: 89,
        liked: false,
        comments: [],
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
];

export {};  // Пустой экспорт для isolatedModules