module.exports = {
  apps: [
    {
      name: "dtrader-crypto",
      script: "./build/main.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
    },
  ],
};
