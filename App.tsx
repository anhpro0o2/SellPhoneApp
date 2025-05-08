import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';

// Import tất cả các màn hình
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import CartScreen from './src/screens/CartScreen';
import ShippingAddressScreen from './src/screens/ShippingAddressScreen';
import PaymentMethodScreen from './src/screens/PaymentMethodScreen';
import OrderSummaryScreen from './src/screens/OrderSummaryScreen';
import PromotionsScreen from './src/screens/PromotionsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OrderHistoryScreen from './src/screens/OrderHistoryScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen'; // <-- Import ChangePasswordScreen

// --- Định nghĩa kiểu cho các Stack ---
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export interface ShippingInfo { fullName: string; phoneNumber: string; address: string; city: string; district: string; ward?: string; notes?: string; }
export interface CartItemForPayment { id: string; name: string; price: number; quantity: number; imageUrl: string; warrantyPeriod?: string; }
export interface OrderDetailsForSummary { shippingInfo: ShippingInfo; paymentMethod: string; items: CartItemForPayment[]; totalAmount: number; depositRequired?: number; paymentStatus?: string; }

export type MainStackParamList = {
  Home: undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
  ShippingAddress: undefined;
  PaymentMethod: { shippingDetails: ShippingInfo; selectedCartItems: CartItemForPayment[] };
  OrderSummary: { orderDetails: OrderDetailsForSummary };
  Promotions: undefined;
  Profile: undefined;
  OrderHistory: undefined;
  OrderDetail: { orderId: string };
  ChangePassword: undefined; // <-- Khai báo ChangePasswordScreen
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

// --- Component Điều hướng Chính ---
const RootNavigator = () => {
  const { user, initializing } = useAuth();
  if (initializing) {
    return ( <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#e83e8c" /></View> );
  }

  return (
    <NavigationContainer>
      {user ? (
        <CartProvider>
          <MainStack.Navigator>
            <MainStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <MainStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Chi tiết sản phẩm', headerShown: true, headerTintColor: '#e83e8c' }} />
            <MainStack.Screen name="Cart" component={CartScreen} options={{ title: 'Giỏ hàng', headerShown: true, headerTintColor: '#e83e8c' }} />
            <MainStack.Screen name="ShippingAddress" component={ShippingAddressScreen} options={{ title: 'Thông tin giao hàng', headerShown: true, headerTintColor: '#e83e8c' }}/>
            <MainStack.Screen name="PaymentMethod" component={PaymentMethodScreen} options={{ title: 'Chọn thanh toán', headerShown: true, headerTintColor: '#e83e8c' }} />
            <MainStack.Screen name="OrderSummary" component={OrderSummaryScreen} options={{ title: 'Xác nhận đơn hàng', headerShown: true, headerTintColor: '#e83e8c' }} />
            <MainStack.Screen name="Promotions" component={PromotionsScreen} options={{ title: 'Ưu Đãi & Khuyến Mãi', headerShown: true, headerTintColor: '#e83e8c' }} />
            <MainStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Tài khoản của tôi', headerShown: true, headerTintColor: '#e83e8c' }} />
            <MainStack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'Lịch sử đơn hàng', headerShown: true, headerTintColor: '#e83e8c' }} />
            <MainStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Chi tiết đơn hàng', headerShown: true, headerTintColor: '#e83e8c' }} />
            {/* --- Khai báo ChangePasswordScreen trong Navigator --- */}
            <MainStack.Screen
                name="ChangePassword"
                component={ChangePasswordScreen}
                options={{
                    title: 'Đổi mật khẩu',
                    headerShown: true,
                    headerTintColor: '#e83e8c',
                }}
            />
          </MainStack.Navigator>
        </CartProvider>
      ) : (
        <AuthStack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
};

function App(): React.JSX.Element { return ( <AuthProvider><RootNavigator /></AuthProvider> ); }
const styles = StyleSheet.create({ loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', }, });
export default App;

// --- Định nghĩa và Export kiểu Props ---
export type LoginScreenNavProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenNavProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;
export type ForgotPasswordScreenNavProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
export type HomeScreenNavProps = NativeStackScreenProps<MainStackParamList, 'Home'>;
export type ProductDetailScreenNavProps = NativeStackScreenProps<MainStackParamList, 'ProductDetail'>;
export type CartScreenNavProps = NativeStackScreenProps<MainStackParamList, 'Cart'>;
export type ShippingAddressScreenNavProps = NativeStackScreenProps<MainStackParamList, 'ShippingAddress'>;
export type PaymentMethodScreenNavProps = NativeStackScreenProps<MainStackParamList, 'PaymentMethod'>;
export type OrderSummaryScreenNavProps = NativeStackScreenProps<MainStackParamList, 'OrderSummary'>;
export type PromotionsScreenNavProps = NativeStackScreenProps<MainStackParamList, 'Promotions'>;
export type ProfileScreenNavProps = NativeStackScreenProps<MainStackParamList, 'Profile'>;
export type OrderHistoryScreenNavProps = NativeStackScreenProps<MainStackParamList, 'OrderHistory'>;
export type OrderDetailScreenNavProps = NativeStackScreenProps<MainStackParamList, 'OrderDetail'>;
export type ChangePasswordScreenNavProps = NativeStackScreenProps<MainStackParamList, 'ChangePassword'>; // <-- Export kiểu
