const level2 = {
    name: "River",
    themeColor: "#2c6e9e",
    skyColor: "#6bb5d0",
    groundColor: "#4a90b0",
    speed: 2.5,
    segments: [
        { type: "ground", length: 300, obstacles: ["banana", "log"] },
        { type: "rope", length: 600, ropeCount: 4 },
        { type: "ground", length: 400, obstacles: ["crocodile", "banana", "log", "crocodile"] },
        { type: "rope", length: 400, ropeCount: 3 },
        { type: "goal", length: 50 }
    ],
    secretTunnels: [
        { position: 250, leadsToSegment: 4, used: false }
    ]
};
