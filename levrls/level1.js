const level1 = {
    name: "Jungle",
    themeColor: "#2d5a3b",
    skyColor: "#87CEEB",
    groundColor: "#6B8E23",
    speed: 2,
    segments: [
        { type: "ground", length: 800, obstacles: ["banana", "snake", "banana", "branch"] },
        { type: "ground", length: 600, obstacles: ["banana", "snake"] },
        { type: "ground", length: 500, obstacles: ["branch", "banana", "snake", "banana"] },
        { type: "goal", length: 50 }
    ],
    secretTunnels: [
        { position: 400, leadsToSegment: 3, used: false }
    ]
};
