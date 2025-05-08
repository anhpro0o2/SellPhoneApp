import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import type { HomeScreenNavProps } from '../../App'; // Đảm bảo đường dẫn đúng
import productsJsonData from '../data/products.json';
import { useAuth } from '../context/AuthContext'; // Đảm bảo đường dẫn đúng
import auth from '@react-native-firebase/auth';
import { useCart } from '../context/CartContext'; // Đảm bảo đường dẫn đúng

// --- Kiểu Product ---
interface Product { id: string; name: string; brand?: string; price: number; oldPrice?: number | null; imageUrl: string; description?: string; stock?: number; discountPercent?: number | null; specifications?: { [key: string]: string | undefined }; colors?: string[]; }

// --- Dữ liệu giả lập ---
const BANNERS = [ { id: '1', imageUrl: 'https://placehold.co/600x300/e83e8c/white?text=Quang+Cao+1' }, { id: '2', imageUrl: 'https://placehold.co/600x300/007bff/white?text=Quang+Cao+2' }, { id: '3', imageUrl: 'https://placehold.co/600x300/28a745/white?text=Quang+Cao+3' }, ];
const CATEGORIES = [ { id: 'apple', name: 'Apple' }, { id: 'samsung', name: 'Samsung' }, { id: 'xiaomi', name: 'Xiaomi' }, { id: 'oppo', name: 'OPPO' }, { id: 'vivo', name: 'Vivo' }, { id: 'realme', name: 'Realme' }, ];
const { width: screenWidth } = Dimensions.get('window');

// --- Hàm xử lý dữ liệu JSON ---
const processJsonData = (data: any[]): Product[] => {
  return data.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.price === 'number' && typeof item.imageUrl === 'string')
    .map(item => ({
      id: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl,
      brand: typeof item.brand === 'string' ? item.brand : undefined,
      oldPrice: typeof item.oldPrice === 'number' ? item.oldPrice : null,
      description: typeof item.description === 'string' ? item.description : undefined,
      stock: typeof item.stock === 'number' ? item.stock : undefined,
      discountPercent: typeof item.discountPercent === 'number' ? item.discountPercent : null,
      specifications: typeof item.specifications === 'object' && item.specifications !== null ? Object.entries(item.specifications).reduce((acc, [key, value]) => { if (typeof value === 'string') { acc[key] = value; } return acc; }, {} as { [key: string]: string | undefined }) : undefined,
      colors: Array.isArray(item.colors) ? item.colors.filter((c: any): c is string => typeof c === 'string') : undefined,
    }));
 };

// --- Component Màn hình chính ---
const HomeScreen: React.FC<HomeScreenNavProps> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products] = useState<Product[]>(() => processJsonData(productsJsonData));
  // const { user } = useAuth(); // Có thể dùng để hiển thị tên user nếu muốn
  const { getCartTotalQuantity } = useCart();
  const totalQuantity = getCartTotalQuantity();

  const handleLogout = async () => {
    try { await auth().signOut(); console.log('User signed out!'); }
    catch (error) { console.error("Lỗi đăng xuất:", error); Alert.alert('Lỗi', 'Đã có lỗi xảy ra khi đăng xuất.'); }
   };

  const goToProductDetail = (productId: string) => { navigation.navigate('ProductDetail', { productId: productId }); };
  const goToCart = () => { navigation.navigate('Cart'); };
  // --- Hàm điều hướng đến Profile ---
  const goToProfile = () => { navigation.navigate('Profile'); };
  // --- Hàm điều hướng đến Promotions ---
  const goToPromotions = () => { navigation.navigate('Promotions'); };


  const renderBannerItem = ({ item }: { item: typeof BANNERS[0] }) => ( <TouchableOpacity style={styles.bannerItem} onPress={() => console.log('Banner pressed:', item.id)}> <Image source={{ uri: item.imageUrl }} style={styles.bannerImage} resizeMode="cover" /> </TouchableOpacity> );
  const renderCategoryItem = ({ item }: { item: typeof CATEGORIES[0] }) => ( <TouchableOpacity style={[ styles.categoryItem, selectedCategory === item.id && styles.categoryItemSelected ]} onPress={() => setSelectedCategory(item.id)} > <Text style={[ styles.categoryText, selectedCategory === item.id && styles.categoryTextSelected ]}> {item.name} </Text> </TouchableOpacity> );
  const renderProductItem = ({ item }: { item: Product }) => {
    const formatPrice = (priceInput: number | null | undefined): string => { if (typeof priceInput === 'number' && !isNaN(priceInput)) { return priceInput.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }); } return ''; };
    return (
      <TouchableOpacity style={styles.productItem} onPress={() => goToProductDetail(item.id)}>
        <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="contain" />
        {typeof item.discountPercent === 'number' && !isNaN(item.discountPercent) && ( <View style={styles.discountBadge}><Text style={styles.discountText}>Giảm {item.discountPercent}%</Text></View> )}
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
          {item.oldPrice != null && <Text style={styles.productOldPrice}>{formatPrice(item.oldPrice)}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = useCallback(() => (
    <>
      <FlatList data={BANNERS} renderItem={renderBannerItem} keyExtractor={item => item.id} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.bannerList} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DANH MỤC SẢN PHẨM</Text>
        <FlatList data={CATEGORIES} renderItem={renderCategoryItem} keyExtractor={item => item.id} horizontal showsHorizontalScrollIndicator={false} style={styles.categoryList} contentContainerStyle={{ paddingHorizontal: 10 }} />
      </View>
      <View style={[styles.section, styles.sectionHeaderContainer]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ĐIỆN THOẠI NỔI BẬT NHẤT</Text>
          <TouchableOpacity onPress={() => Alert.alert("Thông báo", "Chức năng Xem tất cả đang phát triển.")}>
            <Text style={styles.seeAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  ), [selectedCategory]);

  const ListEmptyComponent = useCallback(() => (
     <View style={styles.centered}><Text style={styles.emptyText}>Chưa có sản phẩm nào.</Text></View>
  ), []);

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <TextInput style={styles.searchInput} placeholder="Bạn cần tìm gì?" placeholderTextColor="#888"/>
        <Text style={styles.locationText}>Hồ Chí Minh</Text>
        {/* Nút Ưu đãi */}
        <TouchableOpacity onPress={goToPromotions} style={styles.headerNavButton}>
          <Text style={styles.headerNavButtonText}>Ưu đãi</Text>
        </TouchableOpacity>
        {/* Nút Giỏ hàng */}
        <TouchableOpacity onPress={goToCart} style={styles.cartButtonContainer}>
          <Text style={styles.cartIcon}>🛒</Text>
          {totalQuantity > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalQuantity}</Text>
            </View>
          )}
        </TouchableOpacity>
        {/* Nút Tài khoản/Profile */}
        <TouchableOpacity onPress={goToProfile} style={styles.headerNavButton}>
          <Text style={styles.headerNavButtonText}>👤</Text>
        </TouchableOpacity>
        {/* Nút Đăng xuất */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmptyComponent}
        columnWrapperStyle={styles.productListColumnWrapper}
        contentContainerStyle={styles.productListContentContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// --- Cập nhật Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff', },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  emptyText: { textAlign: 'center', color: '#6c757d', fontSize: 16, marginTop: 30 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#ffffff', },
  searchInput: { flex: 1, height: 40, backgroundColor: '#f1f3f5', borderRadius: 20, paddingHorizontal: 15, fontSize: 14, marginRight: 8, },
  locationText: { fontSize: 12, color: '#333', marginRight: 8, },
  headerNavButton: { // Style cho các nút điều hướng trên header
    paddingHorizontal: 6,
    paddingVertical: 5,
    marginLeft: 4,
  },
  headerNavButtonText: {
    color: '#007bff', // Màu link
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartButtonContainer: { position: 'relative', padding: 5, marginHorizontal: 4, },
  cartIcon: { fontSize: 24, color: '#343a40', },
  cartBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#e83e8c', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', },
  cartBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold', },
  logoutButton: { paddingHorizontal: 6, paddingVertical: 5, marginLeft: 4, },
  logoutButtonText: { color: '#e83e8c', fontSize: 12, fontWeight: 'bold', },
  bannerList: { height: screenWidth * 0.45, },
  bannerItem: { width: screenWidth, height: '100%', },
  bannerImage: { width: '100%', height: '100%', },
  section: { marginTop: 15, marginBottom: 5, },
  sectionHeaderContainer: { paddingHorizontal: 15, marginBottom: 0, },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#343a40', },
  seeAllText: { fontSize: 14, color: '#e83e8c', },
  categoryList: { marginTop: 8, paddingBottom: 10 },
  categoryItem: { paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#f1f3f5', borderRadius: 20, marginHorizontal: 5, borderWidth: 1, borderColor: '#e9ecef', },
  categoryItemSelected: { backgroundColor: '#e83e8c', borderColor: '#e83e8c', },
  categoryText: { fontSize: 13, color: '#495057', },
  categoryTextSelected: { color: '#ffffff', fontWeight: 'bold', },
  productListContentContainer: { paddingHorizontal: 10, paddingBottom: 20, },
  productListColumnWrapper: { justifyContent: 'space-between', },
  productItem: { backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef', overflow: 'hidden', padding: 10, marginBottom: 10, marginHorizontal: 5, width: (screenWidth / 2) - 20, },
  productImage: { width: '100%', height: 140, marginBottom: 8, },
  discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#e83e8c', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, },
  discountText: { color: '#fff', fontSize: 10, fontWeight: 'bold', },
  productName: { fontSize: 13, color: '#343a40', marginBottom: 4, height: 36, },
  priceContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#e83e8c', marginRight: 6, },
  productOldPrice: { fontSize: 11, color: '#6c757d', textDecorationLine: 'line-through', },
});

export default HomeScreen;
