// 全局变量和配置
let deleteFileName = '';
let deleteModal;

// Dropzone配置
Dropzone.autoDiscover = false;

// 文档加载完成后执行
$(document).ready(function() {
    // 初始化删除模态框
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    
    // 初始化Dropzone
    const myDropzone = new Dropzone("#upload-dropzone", {
        paramName: "file",
        maxFilesize: 1024, // MB
        acceptedFiles: null, // 接受所有文件类型
        addRemoveLinks: true,
        dictDefaultMessage: "拖放文件到这里上传，或点击选择文件",
        dictFallbackMessage: "您的浏览器不支持拖放文件上传。",
        dictFileTooBig: "文件太大 ({{filesize}}MB)。最大允许: {{maxFilesize}}MB。",
        dictInvalidFileType: "不能上传此类型的文件。",
        dictResponseError: "服务器返回 {{statusCode}} 错误。",
        dictCancelUpload: "取消上传",
        dictUploadCanceled: "上传已取消。",
        dictRemoveFile: "移除文件",
        dictMaxFilesExceeded: "不能上传更多文件。",
        dictRemoveFileConfirmation: null,
        autoProcessQueue: true,
        createImageThumbnails: true,
        maxFiles: null
    });
    
    // 文件上传成功事件
    myDropzone.on("success", function(file, response) {
        if (response.success) {
            // 显示成功消息
            const successMessage = $('<div class="alert alert-success alert-dismissible fade show" role="alert">')
                .text('文件 ' + response.file.name + ' 上传成功！')
                .append('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>');
            
            $('.container').prepend(successMessage);
            
            // 自动关闭提示
            setTimeout(function() {
                $('.alert').alert('close');
            }, 3000);
            
            // 刷新文件列表
            loadFileList();
        }
    });
    
    // 文件上传错误事件
    myDropzone.on("error", function(file, errorMessage) {
        let message = '上传失败';
        if (typeof errorMessage === 'string') {
            message = errorMessage;
        } else if (errorMessage.message) {
            message = errorMessage.message;
        }
        
        // 显示错误消息
        const errorAlert = $('<div class="alert alert-danger alert-dismissible fade show" role="alert">')
            .text('错误: ' + message)
            .append('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>');
        
        $('.container').prepend(errorAlert);
        
        // 自动关闭提示
        setTimeout(function() {
            $('.alert').alert('close');
        }, 5000);
    });
    
    // 初始加载文件列表
    loadFileList();
    
    // 刷新按钮点击事件
    $('#refresh-btn').click(function() {
        loadFileList();
    });
    
    // 确认删除按钮点击事件
    $('#confirm-delete').click(function() {
        if (deleteFileName) {
            deleteFile(deleteFileName);
        }
    });
});

// 加载文件列表
function loadFileList() {
    // 显示加载中
    $('#file-list').html('<tr><td colspan="4" class="text-center"><div class="spinner-border text-primary" role="status"></div> 加载文件列表中...</td></tr>');
    
    // 发送AJAX请求获取文件列表
    $.ajax({
        url: '/api/files',
        type: 'GET',
        dataType: 'json',
        success: function(data) {
            if (data.files && data.files.length > 0) {
                // 隐藏无文件消息
                $('#no-files-message').addClass('d-none');
                
                // 清空文件列表
                $('#file-list').empty();
                
                // 填充文件列表
                data.files.forEach(function(file) {
                    const row = $('<tr>');
                    
                    // 文件名
                    row.append($('<td>').addClass('file-name').text(file.name));
                    
                    // 文件大小
                    row.append($('<td>').addClass('file-size').text(file.readable_size));
                    
                    // 上传时间
                    row.append($('<td>').addClass('file-time').text(file.upload_time));
                    
                    // 操作按钮
                    const actions = $('<td>');
                    
                    // 下载按钮
                    const downloadBtn = $('<a>')
                        .attr('href', file.url)
                        .attr('download', file.name)
                        .addClass('btn btn-sm btn-primary btn-action')
                        .html('<i class="bi bi-download"></i> 下载');
                    
                    // 删除按钮
                    const deleteBtn = $('<button>')
                        .addClass('btn btn-sm btn-danger btn-action')
                        .attr('data-filename', file.name)
                        .html('<i class="bi bi-trash"></i> 删除')
                        .click(function() {
                            showDeleteConfirm(file.name);
                        });
                    
                    actions.append(downloadBtn).append(deleteBtn);
                    row.append(actions);
                    
                    // 添加到表格
                    $('#file-list').append(row);
                });
                
                // 添加移动设备适配
                if (window.innerWidth < 768) {
                    convertTableToCards();
                }
            } else {
                // 显示无文件消息
                $('#file-list').html('<tr><td colspan="4" class="text-center">暂无上传的文件</td></tr>');
                $('#no-files-message').removeClass('d-none');
            }
        },
        error: function() {
            // 显示错误消息
            $('#file-list').html('<tr><td colspan="4" class="text-center text-danger">加载文件列表失败，请刷新重试</td></tr>');
            
            // 显示错误提示
            const errorAlert = $('<div class="alert alert-danger alert-dismissible fade show" role="alert">')
                .text('加载文件列表失败，请刷新重试')
                .append('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>');
            
            $('.container').prepend(errorAlert);
        }
    });
}

// 显示删除确认对话框
function showDeleteConfirm(filename) {
    deleteFileName = filename;
    $('#delete-filename').text(filename);
    deleteModal.show();
}

// 删除文件
function deleteFile(filename) {
    $.ajax({
        url: '/api/delete/' + encodeURIComponent(filename),
        type: 'DELETE',
        success: function(response) {
            if (response.success) {
                // 关闭模态框
                deleteModal.hide();
                
                // 显示成功消息
                const successMessage = $('<div class="alert alert-success alert-dismissible fade show" role="alert">')
                    .text('文件 ' + filename + ' 已成功删除！')
                    .append('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>');
                
                $('.container').prepend(successMessage);
                
                // 自动关闭提示
                setTimeout(function() {
                    $('.alert').alert('close');
                }, 3000);
                
                // 刷新文件列表
                loadFileList();
            } else {
                // 显示错误消息
                const errorAlert = $('<div class="alert alert-danger alert-dismissible fade show" role="alert">')
                    .text('删除失败: ' + response.message)
                    .append('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>');
                
                $('.container').prepend(errorAlert);
            }
        },
        error: function() {
            // 显示错误消息
            const errorAlert = $('<div class="alert alert-danger alert-dismissible fade show" role="alert">')
                .text('删除文件失败，请重试')
                .append('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>');
            
            $('.container').prepend(errorAlert);
        }
    });
}

// 在移动设备上将表格转换为卡片视图
function convertTableToCards() {
    if ($('#file-list tr').length <= 1) return;
    
    const fileCards = $('<div>').addClass('mobile-file-cards');
    
    $('#file-list tr').each(function() {
        if ($(this).find('td').length < 3) return;
        
        const fileName = $(this).find('td').eq(0).text();
        const fileSize = $(this).find('td').eq(1).text();
        const fileTime = $(this).find('td').eq(2).text();
        const fileActions = $(this).find('td').eq(3).html();
        
        const card = $('<div>').addClass('mobile-file-card');
        card.append($('<h5>').addClass('file-name').text(fileName));
        card.append($('<p>').addClass('mb-1').html('<strong>大小:</strong> ' + fileSize));
        card.append($('<p>').addClass('mb-2').html('<strong>上传时间:</strong> ' + fileTime));
        
        const actionsDiv = $('<div>').addClass('mobile-file-actions').html(fileActions);
        card.append(actionsDiv);
        
        fileCards.append(card);
    });
    
    // 替换表格
    $('.table-responsive').hide();
    $('.table-responsive').after(fileCards);
}

// 窗口大小改变时检查是否需要转换视图
$(window).resize(function() {
    if (window.innerWidth < 768) {
        convertTableToCards();
    } else {
        $('.mobile-file-cards').remove();
        $('.table-responsive').show();
    }
});
