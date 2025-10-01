# Удаляем старый файл если есть
rm -f ecosystem.config.js

# Создаем правильный файл
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'dtrader-crypto',
    script: './build/main.js',
    interpreter: 'node',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '512M',
    
    // Логирование
    log_file: './logs/combined.log',
    out_file: './logs/out.log', 
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    time: true,
    
    // Переменные окружения
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=512'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
EOF