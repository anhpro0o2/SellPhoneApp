import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Định nghĩa kiểu dữ liệu cho giá trị trong Context
interface AuthContextType {
  user: FirebaseAuthTypes.User | null; // Người dùng hiện tại (hoặc null)
  initializing: boolean; // Trạng thái đang kiểm tra đăng nhập ban đầu
  // Thêm các hàm xác thực nếu muốn gọi từ context (tùy chọn)
  // login: (email, password) => Promise<void>;
  // register: (email, password, fullName) => Promise<void>;
  // logout: () => Promise<void>;
}

// Tạo Context với giá trị mặc định
// Sử dụng '!' để khẳng định giá trị ban đầu không phải null, sẽ được cung cấp bởi Provider
const AuthContext = createContext<AuthContextType>(null!);

// Tạo Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [initializing, setInitializing] = useState(true); // Ban đầu đang khởi tạo
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null); // Ban đầu chưa có user

  // Hàm xử lý khi trạng thái auth thay đổi (đăng nhập, đăng xuất)
  function onAuthStateChanged(currentUser: FirebaseAuthTypes.User | null) {
    setUser(currentUser); // Cập nhật state user
    console.log('Auth State Changed, User:', currentUser?.email); // Log để kiểm tra
    if (initializing) {
      setInitializing(false); // Đánh dấu đã khởi tạo xong
    }
  }

  useEffect(() => {
    // Đăng ký listener để theo dõi thay đổi trạng thái auth
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    // Hủy đăng ký listener khi component unmount
    return subscriber;
  }, []); // Chỉ chạy một lần khi component mount

  // Giá trị cung cấp cho Context
  const authContextValue: AuthContextType = {
    user,
    initializing,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Tạo custom hook để dễ dàng sử dụng Context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
