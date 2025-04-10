# 局域网传输小工具部署指南

本文档提供了局域网传输小工具的详细部署说明，包括不同环境下的部署方法、配置选项和最佳实践。

## 基本部署（开发环境）

这是最简单的部署方式，适合临时使用或测试环境。

### 前提条件

- Python 3.6+
- Flask 框架
- 局域网连接
- 足够的存储空间

### 部署步骤

1. **安装依赖**

   ```bash
   pip install flask
   ```

2. **启动应用**

   ```bash
   cd /path/to/lan_transfer_tool
   python app.py
   ```

3. **访问应用**

   在浏览器中访问服务器显示的地址，例如：
   - 本机访问：http://127.0.0.1:5000
   - 局域网访问：http://192.168.x.x:5000（取决于服务器IP地址）

## 生产环境部署

对于需要长期运行的生产环境，建议使用更稳定的部署方式。

### 使用Gunicorn和Nginx（Linux/macOS）

#### 前提条件

- Python 3.6+
- pip 包管理器
- Nginx 服务器
- Gunicorn WSGI服务器

#### 部署步骤

1. **安装依赖**

   ```bash
   pip install flask gunicorn
   sudo apt install nginx  # Ubuntu/Debian
   # 或
   sudo yum install nginx  # CentOS/RHEL
   ```

2. **创建Gunicorn服务文件**

   创建文件 `/etc/systemd/system/lan-transfer.service`：

   ```ini
   [Unit]
   Description=Gunicorn instance to serve lan transfer tool
   After=network.target

   [Service]
   User=your_username
   Group=your_group
   WorkingDirectory=/path/to/lan_transfer_tool
   Environment="PATH=/path/to/venv/bin"
   ExecStart=/path/to/venv/bin/gunicorn --workers 3 --bind 0.0.0.0:8000 app:app

   [Install]
   WantedBy=multi-user.target
   ```

   替换 `your_username`、`your_group` 和路径为实际值。

3. **配置Nginx**

   创建文件 `/etc/nginx/sites-available/lan-transfer`：

   ```nginx
   server {
       listen 80;
       server_name your_domain_or_ip;

       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           client_max_body_size 1024M;  # 允许上传大文件，根据需要调整
       }
   }
   ```

   创建符号链接并重启Nginx：

   ```bash
   sudo ln -s /etc/nginx/sites-available/lan-transfer /etc/nginx/sites-enabled
   sudo nginx -t  # 测试配置
   sudo systemctl restart nginx
   ```

4. **启动服务**

   ```bash
   sudo systemctl start lan-transfer
   sudo systemctl enable lan-transfer  # 设置开机自启
   ```

5. **访问应用**

   在浏览器中访问 `http://your_domain_or_ip`

### 使用Docker部署

#### 前提条件

- Docker 安装
- Docker Compose（可选）

#### 部署步骤

1. **创建Dockerfile**

   在项目根目录创建 `Dockerfile`：

   ```dockerfile
   FROM python:3.9-slim

   WORKDIR /app

   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt

   COPY . .

   # 创建上传目录
   RUN mkdir -p uploads && chmod 777 uploads

   # 暴露端口
   EXPOSE 5000

   # 启动应用
   CMD ["python", "app.py"]
   ```

2. **创建requirements.txt**

   ```
   flask==3.1.0
   ```

3. **创建docker-compose.yml（可选）**

   ```yaml
   version: '3'
   services:
     lan-transfer:
       build: .
       ports:
         - "5000:5000"
       volumes:
         - ./uploads:/app/uploads
       restart: unless-stopped
   ```

4. **构建和运行容器**

   使用Docker Compose：
   ```bash
   docker-compose up -d
   ```

   或直接使用Docker：
   ```bash
   docker build -t lan-transfer .
   docker run -d -p 5000:5000 -v $(pwd)/uploads:/app/uploads --restart unless-stopped lan-transfer
   ```

5. **访问应用**

   在浏览器中访问 `http://your_server_ip:5000`

## Windows服务部署

### 使用NSSM（Non-Sucking Service Manager）

1. **下载并安装NSSM**

   从[NSSM官网](https://nssm.cc/download)下载最新版本

2. **创建Windows服务**

   打开命令提示符（以管理员身份运行）：

   ```cmd
   nssm install LanTransferTool
   ```

   在弹出的窗口中配置：
   - Path: 填写python.exe的完整路径（例如：C:\Python39\python.exe）
   - Startup directory: 填写应用程序目录
   - Arguments: app.py
   - 在Details选项卡中填写服务描述

3. **启动服务**

   ```cmd
   nssm start LanTransferTool
   ```

4. **访问应用**

   在浏览器中访问 `http://localhost:5000` 或 `http://your_ip:5000`

## 反向代理和HTTPS配置

为提高安全性，建议配置HTTPS。

### 使用Nginx和Let's Encrypt

1. **安装Certbot**

   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **获取SSL证书**

   ```bash
   sudo certbot --nginx -d your_domain.com
   ```

3. **Nginx配置会自动更新**，检查配置：

   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **访问应用**

   在浏览器中访问 `https://your_domain.com`

## 性能优化

### 文件存储优化

对于大量文件或大文件的情况：

1. **使用外部存储**

   修改 `app.py` 中的上传目录配置，指向更大的存储设备：

   ```python
   app.config['UPLOAD_FOLDER'] = '/path/to/external/storage'
   ```

2. **定期清理**

   创建定时任务清理旧文件：

   ```bash
   # 创建清理脚本 cleanup.py
   import os
   import time
   from datetime import datetime, timedelta

   UPLOAD_DIR = '/path/to/uploads'
   MAX_AGE_DAYS = 7

   def cleanup():
       now = time.time()
       for filename in os.listdir(UPLOAD_DIR):
           file_path = os.path.join(UPLOAD_DIR, filename)
           if os.path.isfile(file_path):
               file_age = now - os.path.getmtime(file_path)
               if file_age > (MAX_AGE_DAYS * 86400):  # 转换为秒
                   os.remove(file_path)
                   print(f"Removed old file: {filename}")

   if __name__ == "__main__":
       cleanup()
   ```

   添加到crontab：

   ```bash
   0 2 * * * python3 /path/to/cleanup.py  # 每天凌晨2点运行
   ```

### 服务器性能优化

1. **增加Gunicorn工作进程**

   修改服务文件中的workers参数：

   ```
   ExecStart=/path/to/venv/bin/gunicorn --workers 4 --bind 0.0.0.0:8000 app:app
   ```

   一般建议workers数量为CPU核心数的2-4倍。

2. **配置Nginx缓冲**

   在Nginx配置中添加：

   ```nginx
   proxy_buffers 16 16k;
   proxy_buffer_size 16k;
   ```

## 多实例部署

对于大型局域网环境，可以部署多个实例并使用负载均衡：

1. **在不同服务器上部署多个实例**

2. **配置Nginx负载均衡**

   ```nginx
   upstream lan_transfer {
       server 192.168.1.101:5000;
       server 192.168.1.102:5000;
       server 192.168.1.103:5000;
   }

   server {
       listen 80;
       server_name your_domain_or_ip;

       location / {
           proxy_pass http://lan_transfer;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 故障排除

### 常见问题及解决方案

1. **端口被占用**

   ```bash
   # 查找占用端口的进程
   sudo lsof -i :5000
   # 或
   netstat -tuln | grep 5000
   
   # 终止进程
   sudo kill -9 PID
   ```

2. **权限问题**

   ```bash
   # 确保上传目录有正确权限
   sudo chown -R your_user:your_group /path/to/uploads
   sudo chmod -R 755 /path/to/uploads
   ```

3. **服务无法启动**

   检查日志：
   ```bash
   sudo journalctl -u lan-transfer.service
   ```

4. **文件上传失败**

   检查Nginx和应用的文件大小限制：
   ```nginx
   # 在Nginx配置中
   client_max_body_size 1024M;
   ```

## 安全建议

1. **限制访问**

   - 使用防火墙限制只允许局域网IP访问
   - 考虑添加基本的HTTP认证

2. **定期更新**

   保持Python、Flask和其他依赖的最新安全补丁

3. **监控系统**

   设置基本的监控，及时发现异常情况

## 备份策略

1. **定期备份上传的文件**

   ```bash
   # 创建备份脚本
   rsync -av /path/to/uploads/ /path/to/backup/
   ```

2. **备份应用程序代码**

   使用Git或其他版本控制系统管理代码，并定期备份

## 结论

通过本指南，您应该能够根据自己的需求选择合适的部署方式，将局域网传输小工具部署到您的环境中。根据实际使用情况，可能需要进一步调整配置以获得最佳性能和安全性。
