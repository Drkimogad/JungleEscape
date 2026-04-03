const level4 = {
    name: "Volcano",
    themeColor: "#8b3a3a",
    skyColor: "#d46a3a",
    groundColor: "#5a2a1a",
    speed: 3.5,
    segments: [
        { type: "ground", length: 400, obstacles: ["lava", "banana", "lava", "rock"] },
        { type: "rope", length: 500, ropeCount: 5 },
        { type: "ground", length: 300, obstacles: ["lava", "lava", "banana"] },
        { type: "goal", length: 50 }
    ],
    secretTunnels: [
        { position: 250, leadsToSegment: 3, used: false },
        { position: 550, leadsToSegment: 4, used: false }
    ]
};
