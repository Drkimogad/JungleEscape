const level5 = {
    name: "Treetops",
    themeColor: "#2d6a3b",
    skyColor: "#5bc0be",
    groundColor: "#3a8a4a",
    speed: 4,
    segments: [
        { type: "ground", length: 200, obstacles: ["branch", "banana"] },
        { type: "rope", length: 700, ropeCount: 6 },
        { type: "tree", length: 150, climbHeight: 80 },
        { type: "ground", length: 300, obstacles: ["branch", "branch", "banana"] },
        { type: "goal", length: 50 }
    ],
    secretTunnels: []
};
