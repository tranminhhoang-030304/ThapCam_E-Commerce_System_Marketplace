import axios from 'axios';

// 1. Đường ống gọi sang NestJS (Quản lý User, Product)
export const nestApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_PIM_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api', 
    headers: {
        'Content-Type': 'application/json',
    },
});

// 2. Đường ống gọi sang Spring Boot (Quản lý Cart, Order, Payment)
export const springApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_OMS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getAuthToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('access_token');
    }
    return null;
};
export const getRefreshToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('refresh_token');
    }
    return null;
}

let isRefreshing = false;
let failedQueue: any[] = [];

// Hàm nhả hàng đợi khi đã lấy được thẻ mới
const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
};

// 3. Hàm tự động gắn Token cho cả 2 đường ống
const setupInterceptors = (apiInstance: any) => {
    //gắn AT vào request
    apiInstance.interceptors.request.use(
        (config: any) => {
            const token = getAuthToken();
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error: any) => {
            return Promise.reject(error);
        }
    );

    //bắt lỗi và dò refresh_token
    apiInstance.interceptors.response.use(
        (response: any) => response,
        async (error: any) => {
            const originalRequest = error.config;

            // Nếu bị thẻ vàng 401 (Hết hạn) và chưa từng đi xin lại (_retry = false)
            if (error.response?.status === 401 && !originalRequest._retry) {
                
                // Tránh lặp vô tận nếu chính cái API xin thẻ mới cũng bị lỗi
                if (originalRequest.url === '/auth/refresh') {
                    return Promise.reject(error);
                }

                // Nếu đang có thằng khác đi xin thẻ rồi, thì đứng vào hàng đợi
                if (isRefreshing) {
                    return new Promise(function(resolve, reject) {
                        failedQueue.push({ resolve, reject });
                    }).then(token => {
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                        return apiInstance(originalRequest);
                    }).catch(err => Promise.reject(err));
                }

                // Nếu mình là thằng đầu tiên phát hiện thẻ hết hạn:
                originalRequest._retry = true;
                isRefreshing = true;

                const refreshToken = getRefreshToken();
                
                // Không có thẻ Refresh -> Đuổi thẳng cổ ra trang Đăng nhập
                if (!refreshToken) {
                    if (typeof window !== 'undefined') {
                        localStorage.clear();
                        window.location.href = '/auth/login';
                    }
                    return Promise.reject(error);
                }

                // Mang thẻ Refresh đi xin thẻ Access mới
                return new Promise(function (resolve, reject) {
                    // Gọi bằng thư viện axios gốc để không bị dính vòng lặp đánh chặn
                    axios.post(`${process.env.NEXT_PUBLIC_API_PIM_URL || 'http://localhost:4000/api'}/auth/refresh`, {
                        refresh_token: refreshToken
                    })
                    .then(({ data }) => {
                        // Lấy được thẻ mới: Lưu ngay vào túi
                        localStorage.setItem('access_token', data.access_token);
                        localStorage.setItem('refresh_token', data.refresh_token);
                        
                        // Thay thẻ mới vào request hiện tại
                        originalRequest.headers['Authorization'] = 'Bearer ' + data.access_token;
                        
                        // Kêu gọi anh em trong hàng đợi chạy tiếp đi
                        processQueue(null, data.access_token);
                        
                        // Chạy lại cái request vừa bị chết
                        resolve(apiInstance(originalRequest));
                    })
                    .catch((err) => {
                        // Xui xẻo thẻ Refresh cũng hết hạn nốt -> Bắt đăng nhập lại
                        processQueue(err, null);
                        if (typeof window !== 'undefined') {
                            localStorage.clear();
                            window.location.href = '/auth/login';
                        }
                        reject(err);
                    })
                    .finally(() => {
                        isRefreshing = false; // Xong việc, gỡ cờ
                    });
                });
            }

            // Nếu là các lỗi khác (500, 404...) thì văng ra bình thường
            return Promise.reject(error);
        }
    );
};

// Kích hoạt Interceptor
setupInterceptors(nestApi);
setupInterceptors(springApi);