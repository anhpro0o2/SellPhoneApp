import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Keyboard,
  ActivityIndicator,
  Platform,
} from 'react-native';
import type { HomeScreenNavProps } from '../../App';
import productsJsonData from '../data/products.json';
import { useAuth } from '../context/AuthContext';
import auth from '@react-native-firebase/auth';
import { useCart } from '../context/CartContext';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';

// --- Kiểu Product ---
interface Product {
  id: string;
  name: string;
  brand?: string;
  price: number;
  oldPrice?: number | null;
  imageUrl: string;
  description?: string;
  stock?: number;
  discountPercent?: number | null;
  specifications?: { [key: string]: string | undefined };
  colors?: string[];
  averageRating?: number;
  reviewCount?: number;
}

// --- Kiểu Review ---
interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

const BANNERS = [
  { id: '1', imageUrl: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:690:300/q:90/plain/https://dashboard.cellphones.com.vn/storage/iphone-16-pro-max-thu-cu-moi-home.jpg' },
  { id: '2', imageUrl: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:690:300/q:90/plain/https://dashboard.cellphones.com.vn/storage/s25-ultra-home-gia-moi.png' },
  { id: '3', imageUrl: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:690:300/q:90/plain/https://dashboard.cellphones.com.vn/storage/poco-x7-moi-home.jpg' },
  { id: '4', imageUrl: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:690:300/q:90/plain/https://dashboard.cellphones.com.vn/storage/vivo-v50-home.png' },
  { id: '5', imageUrl: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:690:300/q:90/plain/https://dashboard.cellphones.com.vn/storage/ai-hay-home.jpg' },
];
const CATEGORIES = [ { id: 'apple', name: 'Apple' }, { id: 'samsung', name: 'Samsung' }, { id: 'xiaomi', name: 'Xiaomi' }, { id: 'oppo', name: 'OPPO' }, { id: 'vivo', name: 'Vivo' }, { id: 'realme', name: 'Realme' }, ];
const { width: screenWidth } = Dimensions.get('window');
const BANNER_INTERVAL = 4000;
const BANNER_HEIGHT = screenWidth * 0.4;

const processJsonData = (data: any[]): Product[] => {
  return data.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.price === 'number' && typeof item.imageUrl === 'string')
    .map(item => ({
      id: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl,
      brand: typeof item.brand === 'string' ? item.brand : undefined,
      oldPrice: typeof item.oldPrice === 'number' ? item.oldPrice : null,
      description: typeof item.description === 'string' ? item.description : undefined,
      stock: typeof item.stock === 'number' ? item.stock : 10,
      discountPercent: typeof item.discountPercent === 'number' ? item.discountPercent : null,
      specifications: typeof item.specifications === 'object' && item.specifications !== null ? Object.entries(item.specifications).reduce((acc, [key, value]) => { if (typeof value === 'string') { acc[key] = value; } return acc; }, {} as { [key: string]: string | undefined }) : undefined,
      colors: Array.isArray(item.colors) ? item.colors.filter((c: any): c is string => typeof c === 'string') : undefined,
      averageRating: undefined,
      reviewCount: 0,
    }));
};


const HomeScreen: React.FC<HomeScreenNavProps> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [baseProducts] = useState<Product[]>(() => processJsonData(productsJsonData));
  const [productsWithRatings, setProductsWithRatings] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const { getCartTotalQuantity } = useCart();
  const totalQuantity = getCartTotalQuantity();
  const [isLoadingRatings, setIsLoadingRatings] = useState(true);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const flatListRef = useRef<FlatList<any>>(null);

  const fetchAndProcessRatings = useCallback(async () => {
    console.log('[HomeScreen] Fetching and processing ratings...');
    setIsLoadingRatings(true);
    try {
      const reviewsSnapshot = await firestore().collection('reviews').get();
      const allReviews: Review[] = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Review));
      const productsWithAggregatedRatings = baseProducts.map(product => {
        const productReviews = allReviews.filter(review => review.productId === product.id);
        const reviewCount = productReviews.length;
        let averageRating: number | undefined = undefined;
        if (reviewCount > 0) {
          const totalRating = productReviews.reduce((sum, review) => sum + review.rating, 0);
          averageRating = parseFloat((totalRating / reviewCount).toFixed(1));
        }
        return { ...product, averageRating, reviewCount };
      });
      setProductsWithRatings(productsWithAggregatedRatings);
      console.log('[HomeScreen] Ratings processed and set.');
    } catch (error) {
      console.error("[HomeScreen] Lỗi tải và xử lý đánh giá:", error);
      setProductsWithRatings(baseProducts);
    } finally {
      setIsLoadingRatings(false);
    }
  }, [baseProducts]);

  useFocusEffect(useCallback(() => { fetchAndProcessRatings(); return () => {}; }, [fetchAndProcessRatings]));

  useEffect(() => {
    let tempFiltered = [...productsWithRatings];
    const lowerCaseQuery = searchQuery.toLowerCase().trim();
    if (selectedCategory) {
      tempFiltered = tempFiltered.filter(product =>
        product.brand?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    if (lowerCaseQuery) {
      tempFiltered = tempFiltered.filter(product =>
        product.name.toLowerCase().includes(lowerCaseQuery)
      );
    }
    setFilteredProducts(tempFiltered);
  }, [searchQuery, selectedCategory, productsWithRatings]);


  useEffect(() => {
    if (BANNERS.length > 0) {
      const interval = setInterval(() => {
        setActiveBannerIndex(prevIndex => {
          const nextIndex = prevIndex === BANNERS.length - 1 ? 0 : prevIndex + 1;
          return nextIndex;
        });
      }, BANNER_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [BANNERS.length]);

  useEffect(() => {
    if (flatListRef.current && BANNERS.length > 0 && activeBannerIndex < BANNERS.length) {
      flatListRef.current.scrollToIndex({
        animated: true,
        index: activeBannerIndex,
        viewPosition: 0.5,
      });
    }
  }, [activeBannerIndex, BANNERS.length]);

  const handleLogout = async () => {
    try { await auth().signOut(); console.log('User signed out!'); }
    catch (error) { console.error("Lỗi đăng xuất:", error); Alert.alert('Lỗi', 'Đã có lỗi xảy ra khi đăng xuất.'); }
  };
  const goToProductDetail = (productId: string) => { navigation.navigate('ProductDetail', { productId: productId }); };
  const goToCart = () => { navigation.navigate('Cart'); };
  const goToProfile = () => { navigation.navigate('Profile'); };
  const goToPromotions = () => { navigation.navigate('Promotions'); }; // Hàm này vẫn tồn tại

  const renderBannerItem = ({ item }: { item: typeof BANNERS[0] }) => (
    <TouchableOpacity style={styles.bannerItem} onPress={() => console.log('Banner pressed:', item.id)} activeOpacity={0.9}>
      <Image source={{ uri: item.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
    </TouchableOpacity>
  );

  const renderCategoryItem = ({ item }: { item: typeof CATEGORIES[0] }) => (
    <TouchableOpacity
        style={[ styles.categoryItem, selectedCategory === item.id && styles.categoryItemSelected ]}
        onPress={() => setSelectedCategory(prev => prev === item.id ? null : item.id)}
    >
        <Text style={[ styles.categoryText, selectedCategory === item.id && styles.categoryTextSelected ]}> {item.name} </Text>
    </TouchableOpacity>
  );

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
        <View style={styles.ratingContainer}>
          {item.averageRating !== undefined && typeof item.reviewCount === 'number' && item.reviewCount > 0 ? (
            <>
              {[...Array(5)].map((_, i) => (
                <Text key={i} style={item.averageRating! >= (i + 0.75) ? styles.starFilled : (item.averageRating! >= (i + 0.25) ? styles.starHalf : styles.starOutline)}>★</Text>
              ))}
              <Text style={styles.ratingText}> ({item.reviewCount})</Text>
            </>
          ) : (
            <Text style={styles.noRatingText}>Chưa có đánh giá</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getItemLayoutForBanner = useCallback((data: any, index: number) => ({
    length: screenWidth,
    offset: screenWidth * index,
    index,
  }), []);

  const ListHeader = useCallback(() => (
     <>
      <View style={styles.bannerContainer}>
        <FlatList
          ref={flatListRef}
          data={BANNERS}
          renderItem={renderBannerItem}
          keyExtractor={item => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.bannerList}
          getItemLayout={getItemLayoutForBanner}
        />
        <View style={styles.pagination}>
          {BANNERS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                activeBannerIndex === index ? styles.paginationDotActive : styles.paginationDotInactive,
              ]}
            />
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DANH MỤC SẢN PHẨM</Text>
        <FlatList data={CATEGORIES} renderItem={renderCategoryItem} keyExtractor={item => item.id} horizontal showsHorizontalScrollIndicator={false} style={styles.categoryList} contentContainerStyle={{ paddingHorizontal: 10 }} />
      </View>
      <View style={[styles.section, styles.sectionHeaderContainer]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? `Kết quả cho "${searchQuery}"` : (selectedCategory ? `Điện thoại ${CATEGORIES.find(c=>c.id===selectedCategory)?.name}` : 'ĐIỆN THOẠI NỔI BẬT')}
          </Text>
          {!searchQuery && !selectedCategory && (
            <TouchableOpacity onPress={() => Alert.alert("Thông báo", "Chức năng Xem tất cả đang phát triển.")}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  ), [selectedCategory, searchQuery, activeBannerIndex, renderBannerItem, renderCategoryItem, getItemLayoutForBanner]);

  const ListEmptyComponent = useCallback(() => (
     <View style={styles.centered}><Text style={styles.emptyText}>Không tìm thấy sản phẩm nào.</Text></View>
  ), []);

  if (isLoadingRatings && productsWithRatings.length === 0) {
    return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color="#D70018" />
            <Text style={{marginTop: 10, color: '#333'}}>Đang tải sản phẩm...</Text>
        </View>
    );
  }

  return (
    <TouchableOpacity activeOpacity={1} onPress={Keyboard.dismiss} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#181A1B" />
      <View style={styles.topBanner}>
        <Text style={styles.topBannerIcon}>🛡️</Text>
        <Text style={styles.topBannerText}>Sản phẩm Chính hãng - Xuất VAT đầy đủ</Text>
      </View>
      <View style={styles.mainHeader}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.logoContainer}>
           <Image source={require('../assets/cellphones-icon-unplated.png')} style={styles.logoImage} />
        </TouchableOpacity>
        <TextInput
            style={styles.mainSearchInput}
            placeholder="Bạn cần tìm gì?"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
        />
        {/* Nút Ưu đãi KHÔNG có ở đây trong phiên bản này */}
        <TouchableOpacity onPress={goToCart} style={styles.headerIconContainer}>
          <Text style={styles.headerIcon}>🛒</Text>
          {totalQuantity > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalQuantity}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={goToProfile} style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>👤</Text>
        </TouchableOpacity>
         <TouchableOpacity onPress={handleLogout} style={[styles.headerIconContainer, styles.logoutButtonHeader]}>
            <Text style={[styles.headerIcon, {fontSize: 14, color: '#fff'}]}>Thoát</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmptyComponent}
        columnWrapperStyle={styles.productListColumnWrapper}
        contentContainerStyle={styles.productListContentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </TouchableOpacity>
  );
};

// Styles (giữ nguyên)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f4f4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4f4' },
  emptyText: { textAlign: 'center', color: '#6c757d', fontSize: 16, },
  topBanner: { backgroundColor: '#D70018', paddingVertical: 8, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', },
  topBannerIcon: { fontSize: 14, marginRight: 8, },
  topBannerText: { color: '#fff', fontSize: 13, fontWeight: '500', },
  mainHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#D70018', borderBottomWidth: 1, borderBottomColor: '#B20014', },
  logoContainer: { paddingHorizontal: 8, },
  logoImage: { width: 30, height: 30, resizeMode: 'contain' },
  mainSearchInput: { flex: 1, height: 38, backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 12, fontSize: 14, color: '#333', marginHorizontal: 8, },
  headerIconContainer: { padding: 8, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  headerIcon: { fontSize: 22, color: '#fff', },
  // promoIcon: { fontSize: 20 }, // Không cần nữa nếu nút Ưu đãi không ở đây
  cartBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#fff', borderRadius: 9, width: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D70018' },
  cartBadgeText: { color: '#D70018', fontSize: 10, fontWeight: 'bold', },
  logoutButtonHeader: { /* Style riêng nếu cần */ },
  bannerContainer: { height: BANNER_HEIGHT + 30, backgroundColor: '#fff', position: 'relative', },
  bannerList: { height: BANNER_HEIGHT, },
  bannerItem: { width: screenWidth, height: '100%', },
  bannerImage: { width: '100%', height: '100%', },
  pagination: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', },
  paginationDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4, },
  paginationDotActive: { backgroundColor: '#D70018', width: 10, height: 10, borderRadius: 5, },
  paginationDotInactive: { backgroundColor: 'rgba(0, 0, 0, 0.3)', },
  section: { marginTop: 0, marginBottom: 0, backgroundColor: '#f4f4f4' },
  sectionHeaderContainer: { paddingHorizontal: 15, paddingTop: 15, paddingBottom:5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', flexShrink: 1, marginRight: 10 },
  seeAllText: { fontSize: 14, color: '#D70018', fontWeight: '500' },
  categoryList: { paddingVertical: 10, backgroundColor: '#fff', paddingBottom: 15 },
  categoryItem: { paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#f0f0f0', borderRadius: 20, marginHorizontal: 5, borderWidth: 1, borderColor: 'transparent', },
  categoryItemSelected: { backgroundColor: '#D70018', borderColor: '#D70018', },
  categoryText: { fontSize: 13, color: '#333', },
  categoryTextSelected: { color: '#ffffff', fontWeight: 'bold', },
  productListContentContainer: { paddingHorizontal: 10, paddingBottom: 20, backgroundColor: '#f4f4f4' },
  productListColumnWrapper: { justifyContent: 'space-between', },
  productItem: { backgroundColor: '#ffffff', borderRadius: 8, overflow: 'hidden', padding: 10, marginBottom: 10, marginHorizontal: 5, width: (screenWidth / 2) - 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, },
  productImage: { width: '100%', height: 140, marginBottom: 8, },
  discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#D70018', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, },
  discountText: { color: '#fff', fontSize: 10, fontWeight: 'bold', },
  productName: { fontSize: 13, color: '#333', marginBottom: 4, height: 36, },
  priceContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', marginBottom: 5 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#D70018', marginRight: 6, },
  productOldPrice: { fontSize: 11, color: '#888', textDecorationLine: 'line-through', },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6, },
  starFilled: { color: '#FFC107', fontSize: 14, marginRight: 1, },
  starHalf: { color: '#FFC107', fontSize: 14, marginRight: 1, },
  starOutline: { color: '#DCDCDC', fontSize: 14, marginRight: 1, },
  ratingText: { fontSize: 12, color: '#6c757d', marginLeft: 4, },
  noRatingText: { fontSize: 12, color: '#6c757d', fontStyle: 'italic', marginTop: 6, },
});

export default HomeScreen;
