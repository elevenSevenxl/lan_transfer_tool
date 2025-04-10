#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify, send_from_directory, render_template, redirect, url_for
import os
import datetime
import time
import json
from werkzeug.utils import secure_filename

# 应用配置
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 限制上传文件大小为1GB
app.config['ALLOWED_EXTENSIONS'] = set(['txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z', 'tar', 'gz', 'mp3', 'mp4', 'avi', 'mov', 'mkv'])

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# 检查文件扩展名是否允许
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS'] or \
           app.config['ALLOWED_EXTENSIONS'] == set(['*'])

# 获取文件大小的可读形式
def get_readable_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes/1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes/(1024*1024):.2f} MB"
    else:
        return f"{size_bytes/(1024*1024*1024):.2f} GB"

# 获取文件列表
def get_file_list():
    files = []
    for filename in os.listdir(app.config['UPLOAD_FOLDER']):
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.isfile(file_path):
            file_stats = os.stat(file_path)
            size = file_stats.st_size
            readable_size = get_readable_size(size)
            upload_time = datetime.datetime.fromtimestamp(file_stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            files.append({
                'name': filename,
                'size': size,
                'readable_size': readable_size,
                'upload_time': upload_time,
                'url': url_for('download_file', filename=filename)
            })
    # 按上传时间排序，最新的在前面
    files.sort(key=lambda x: x['upload_time'], reverse=True)
    return files

# 主页路由
@app.route('/')
def index():
    return render_template('index.html')

# API: 获取文件列表
@app.route('/api/files', methods=['GET'])
def list_files():
    files = get_file_list()
    return jsonify({'files': files})

# API: 上传文件
@app.route('/api/upload', methods=['POST'])
def upload_file():
    # 检查是否有文件
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': '没有选择文件'}), 400
    
    file = request.files['file']
    
    # 检查文件名是否为空
    if file.filename == '':
        return jsonify({'success': False, 'message': '没有选择文件'}), 400
    
    # 检查文件类型是否允许
    if file and allowed_file(file.filename):
        print(f"文件类型名称==============: {file.filename}")
        filename = file.filename
        # 确保文件名不重复
        base, ext = os.path.splitext(filename)
        counter = 1
        while os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'], filename)):
            filename = f"{base}_{counter}{ext}"
            counter += 1
            
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # 获取文件信息
        file_stats = os.stat(file_path)
        size = file_stats.st_size
        readable_size = get_readable_size(size)
        upload_time = datetime.datetime.fromtimestamp(file_stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
        
        return jsonify({
            'success': True,
            'message': '文件上传成功',
            'file': {
                'name': filename,
                'size': size,
                'readable_size': readable_size,
                'upload_time': upload_time,
                'url': url_for('download_file', filename=filename)
            }
        })
    
    return jsonify({'success': False, 'message': '不允许的文件类型'}), 400

# API: 下载文件
@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

# API: 删除文件
@app.route('/api/delete/<filename>', methods=['DELETE'])
def delete_file(filename):
    # file_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(filename))
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        return jsonify({'success': True, 'message': '文件删除成功'})
    return jsonify({'success': False, 'message': '文件不存在'}), 404

# 启动服务器
if __name__ == '__main__':
    # 获取本机IP地址（更可靠的方法）
    import socket
    try:
        # 创建一个临时socket连接来获取本机IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except:
        # 如果获取失败，使用本地回环地址
        local_ip = "127.0.0.1"
    
    print(f"局域网传输工具服务器启动中...")
    print(f"请在浏览器中访问: http://{local_ip}:5000")
    print(f"或者使用本机地址: http://127.0.0.1:5000")
    print(f"按 Ctrl+C 停止服务器")
    
    # 启动Flask应用，监听所有网络接口
    app.run(host='0.0.0.0', port=5000, debug=True)
