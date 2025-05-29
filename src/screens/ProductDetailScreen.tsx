import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import type { ProductDetailScreenNavProps } from '../../App';
import productsJsonData from '../data/products.json';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';

// Kiểu Product
interface Product { id: string; name: string; brand?: string; price: number; oldPrice?: number | null; imageUrl: string; description?: string; stock?: number; discountPercent?: number | null; specifications?: { [key: string]: string | undefined }; colors?: string[]; }

// Kiểu Review
interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  rating: number;
  comment: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

const getProductById = (id: string): Product | undefined => {
    const processedProducts = productsJsonData.filter(item => item && typeof item.id === 'string').map(item => ({
        id: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl,
        brand: typeof item.brand === 'string' ? item.brand : undefined,
        oldPrice: typeof item.oldPrice === 'number' ? item.oldPrice : null,
        description: typeof item.description === 'string' ? item.description : undefined,
        stock: typeof item.stock === 'number' ? item.stock : undefined,
        discountPercent: typeof item.discountPercent === 'number' ? item.discountPercent : null,
        specifications: typeof item.specifications === 'object' && item.specifications !== null ? Object.entries(item.specifications).reduce((acc, [key, value]) => { if (typeof value === 'string') { acc[key] = value; } return acc; }, {} as { [key: string]: string | undefined }) : undefined,
        colors: Array.isArray(item.colors) ? item.colors.filter((c: any): c is string => typeof c === 'string') : undefined,
    }));
    return processedProducts.find(p => p.id === id);
};

// --- SỬA LỖI: Hàm chuyển đổi tên màu sang mã màu ---
const getColorCode = (colorName?: string): string => {
  if (!colorName) return '#cccccc';
  const name = colorName.toLowerCase().trim();
  switch (name) {
    case 'titan tự nhiên': return '#D0C8BF';
    case 'titan xanh': return '#5F7A7D';
    case 'titan đen': return '#3B3B3B';
    case 'titan trắng': return '#F5F5F0';
    case 'đen': return '#000000';
    case 'trắng': return '#F5F5F5';
    case 'xanh dương': return '#007AFF';
    case 'hồng': return '#FFC0CB';
    case 'vàng': return '#FFD700';
    case '(product)red': return '#FF3B30';
    case 'xám titan': return '#8A8D8F';
    case 'tím titan': return '#6C5B7B';
    case 'vàng titan': return '#B08D57';
    case 'xanh titan': return '#5F7A7D';
    case 'đen phantom': return '#1C1C1C';
    case 'xanh icy': return '#A0D2DB';
    case 'kem': return '#F5F5DC';
    case 'tím fancy': return '#C8A2C8';
    case 'xanh mint': return '#98FB98';
    case 'xám graphite': return '#555555';
    case 'vàng cream': return '#FFFDD0';
    case 'đen awesome': return '#2F2F2F';
    case 'xanh awesome': return '#7BC8F6';
    case 'trắng awesome': return '#E8E8E8';
    case 'bạc ánh trăng': return '#C0C0C0';
    case 'đen sao đêm': return '#2C3E50';
    case 'xanh ngọc bích': return '#50C878';
    case 'đen mạnh mẽ': return '#343a40';
    case 'xanh thời thượng': return '#17a2b8';
    case 'xanh lá': return '#28a745';
    case 'xanh dương (titanium special edition)': return '#4682B4';
    case 'bạc': return '#C0C0C0';
    case 'đen thiên thạch': return '#36454F';
    case 'trắng ánh sao': return '#F0F8FF';
    case 'xanh băng giá': return '#ADD8E6';
    case 'cam (da)': return '#FFA500';
    case 'blue': return '#0000FF';
    case 'green': return '#008000';
    case 'yellow': return '#FFFF00';
    case 'purple': return '#800080';
    case 'orange': return '#FFA500';
    case 'grey': case 'gray': return '#808080';
    case 'silver': return '#C0C0C0';
    default:
      // --- SỬA LỖI: Xóa CSS.supports ---
      if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(name) || /^(rgb|rgba|hsl|hsla)\(/.test(name)) {
        return name; // Trả về nếu là mã màu hex hoặc rgb/hsl
      }
      // Kiểm tra các tên màu CSS cơ bản (có thể mở rộng danh sách này)
      const basicCssColors = ["aliceblue", "antiquewhite", /* ... thêm các tên màu CSS khác nếu cần ... */ "whitesmoke", "yellow", "yellowgreen"];
      if (basicCssColors.includes(name)) {
        return name;
      }
      // --- KẾT THÚC SỬA LỖI ---
      console.warn(`[ProductDetailScreen] Unknown color name: "${colorName}", using default.`);
      return '#cccccc';
  }
};


const ProductDetailScreen: React.FC<ProductDetailScreenNavProps> = ({ route, navigation }) => {
  const { productId } = route.params;
  const { user } = useAuth();
  const { addItemToCart, getCartItemQuantity } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasUserPurchasedAndCompleted, setHasUserPurchasedAndCompleted] = useState(false);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);

  useEffect(() => {
    const foundProduct = getProductById(productId);
    if (foundProduct) {
      setProduct(foundProduct);
      if (foundProduct.colors && foundProduct.colors.length > 0) {
        setSelectedColor(foundProduct.colors[0]);
      }
    } else {
      Alert.alert('Lỗi', 'Không tìm thấy sản phẩm.');
      navigation.goBack();
    }
    setIsLoadingProduct(false);
  }, [productId, navigation]);

  // --- SỬA LỖI: Khôi phục thân hàm fetchReviewsAndStatus ---
  const fetchReviewsAndStatus = useCallback(async () => {
    if (!product) return;
    console.log(`[ProductDetailScreen] Fetching reviews for productId: ${product.id}`);
    setIsLoadingReviews(true);
    try {
      const reviewsSnapshot = await firestore()
        .collection('reviews')
        .where('productId', '==', product.id)
        .orderBy('createdAt', 'desc')
        .get();
      const fetchedReviews: Review[] = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Review));
      setReviews(fetchedReviews);

      if (user && fetchedReviews.some(review => review.userId === user.uid)) {
        setHasUserReviewed(true);
        console.log('[ProductDetailScreen] User has already reviewed this product.');
      } else {
        setHasUserReviewed(false);
      }
    } catch (error) {
      console.error("[ProductDetailScreen] Lỗi tải đánh giá:", error);
    } finally {
      setIsLoadingReviews(false);
    }
  }, [product, user]);
  // --- KẾT THÚC SỬA LỖI ---

  // --- SỬA LỖI: Khôi phục thân hàm checkIfUserPurchasedAndCompleted ---
  const checkIfUserPurchasedAndCompleted = useCallback(async () => {
    if (!user || !product) {
      setHasUserPurchasedAndCompleted(false);
      return;
    }
    console.log(`[ProductDetailScreen] Checking purchase status for productId: ${product.id}, userId: ${user.uid}`);
    try {
      const ordersSnapshot = await firestore()
        .collection('orders')
        .where('userId', '==', user.uid)
        .get();

      let purchasedAndCompleted = false;
      ordersSnapshot.forEach(doc => {
        const orderData = doc.data();
        if (orderData.items && Array.isArray(orderData.items)) {
          if (orderData.items.some((item: any) => item.id === product.id)) {
            if (orderData.orderStatus === 'Đã hoàn tất') {
                 purchasedAndCompleted = true;
            }
          }
        }
      });
      setHasUserPurchasedAndCompleted(purchasedAndCompleted);
      console.log('[ProductDetailScreen] User purchased and completed status:', purchasedAndCompleted);
    } catch (error) {
      console.error("[ProductDetailScreen] Lỗi kiểm tra lịch sử mua hàng:", error);
      setHasUserPurchasedAndCompleted(false);
    }
  }, [user, product]);
  // --- KẾT THÚC SỬA LỖI ---

  useFocusEffect(useCallback(() => { if (product) { fetchReviewsAndStatus(); checkIfUserPurchasedAndCompleted(); } }, [product, fetchReviewsAndStatus, checkIfUserPurchasedAndCompleted]));

  // --- SỬA LỖI: Khôi phục thân hàm handleAddToCart ---
  const handleAddToCart = () => {
    if (product) {
      if ((product.stock || 0) < quantity) {
        Alert.alert('Hết hàng', 'Số lượng bạn chọn vượt quá số lượng tồn kho.');
        return;
      }
      addItemToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        stock: product.stock,
        quantity: quantity,
      });
      Alert.alert('Thành công', `${product.name} đã được thêm vào giỏ hàng!`);
    }
  };
  // --- KẾT THÚC SỬA LỖI ---

  // --- SỬA LỖI: Khôi phục thân hàm handleSubmitReview ---
  const handleSubmitReview = async () => {
    if (!user) { Alert.alert('Lỗi', 'Bạn cần đăng nhập để gửi đánh giá.'); return; }
    if (userRating === 0) { Alert.alert('Lỗi', 'Vui lòng chọn số sao đánh giá.'); return; }
    if (!userComment.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập nội dung bình luận.'); return; }
    if (!hasUserPurchasedAndCompleted) {
        Alert.alert('Thông báo', 'Bạn cần mua và xác nhận đã nhận sản phẩm này để có thể đánh giá.');
        return;
    }
    if (hasUserReviewed) {
        Alert.alert('Thông báo', 'Bạn đã đánh giá sản phẩm này rồi.');
        return;
    }
    setIsSubmittingReview(true);
    try {
      const reviewData = {
        productId: product!.id,
        userId: user.uid,
        userName: user.displayName || user.email || 'Người dùng ẩn danh',
        userAvatar: user.photoURL,
        rating: userRating,
        comment: userComment.trim(),
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      await firestore().collection('reviews').add(reviewData);
      Alert.alert('Thành công', 'Cảm ơn bạn đã gửi đánh giá!');
      setUserRating(0);
      setUserComment('');
      fetchReviewsAndStatus();
    } catch (error) {
      console.error("Lỗi gửi đánh giá:", error);
      Alert.alert('Lỗi', 'Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setIsSubmittingReview(false);
    }
  };
  // --- KẾT THÚC SỬA LỖI ---

  // --- SỬA LỖI: Khôi phục thân hàm renderStar ---
  const renderStar = (index: number) => (
    <TouchableOpacity key={index} onPress={() => setUserRating(index + 1)}>
      <Text style={userRating > index ? styles.starFilled : styles.starOutline}>★</Text>
    </TouchableOpacity>
  );
  // --- KẾT THÚC SỬA LỖI ---

  // --- SỬA LỖI: Khôi phục thân hàm renderReviewItem ---
  const renderReviewItem = ({ item }: { item: Review }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Image source={{ uri: item.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userName)}&background=random` }} style={styles.reviewAvatar} />
        <View>
          <Text style={styles.reviewUserName}>{item.userName}</Text>
          <View style={styles.starRating}>
            {[...Array(5)].map((_, i) => (
              <Text key={i} style={item.rating > i ? styles.starFilledSmall : styles.starOutlineSmall}>★</Text>
            ))}
          </View>
        </View>
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
      <Text style={styles.reviewDate}>
        {item.createdAt ? item.createdAt.toDate().toLocaleDateString('vi-VN') : 'Đang tải...'}
      </Text>
    </View>
  );
  // --- KẾT THÚC SỬA LỖI ---

  // --- SỬA LỖI: Khôi phục thân hàm if (isLoadingProduct || !product) ---
  if (isLoadingProduct || !product) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#e83e8c" /></View>;
  }
  // --- KẾT THÚC SỬA LỖI ---

  const formatPrice = (price: number): string => price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? undefined : "height"}
        style={styles.safeArea}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="contain" />
        <View style={styles.detailsContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.brand && <Text style={styles.productBrand}>Thương hiệu: {product.brand}</Text>}
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>{formatPrice(product.price)}</Text>
            {product.oldPrice && <Text style={styles.oldPrice}>{formatPrice(product.oldPrice)}</Text>}
            {product.discountPercent && <Text style={styles.discountBadgeText}>-{product.discountPercent}%</Text>}
          </View>

          {product.colors && product.colors.length > 0 && (
            <View style={styles.colorSelector}>
              <Text style={styles.selectorLabel}>Màu sắc:</Text>
              {product.colors.map(colorName => (
                <TouchableOpacity
                  key={colorName}
                  style={[
                    styles.colorOption,
                    selectedColor === colorName && styles.selectedColorOption,
                    { backgroundColor: getColorCode(colorName) }
                  ]}
                  onPress={() => setSelectedColor(colorName)}
                >
                  {selectedColor === colorName && <Text style={styles.colorCheckMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.quantitySelector}>
            <Text style={styles.selectorLabel}>Số lượng:</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity onPress={() => setQuantity(q => Math.max(1, q - 1))} style={styles.quantityButton}><Text style={styles.quantityButtonText}>-</Text></TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity(q => Math.min(product.stock || 10, q + 1))} style={styles.quantityButton}><Text style={styles.quantityButtonText}>+</Text></TouchableOpacity>
            </View>
            {product.stock !== undefined && <Text style={styles.stockInfo}>Còn lại: {product.stock} sản phẩm</Text>}
          </View>

          {product.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Mô tả sản phẩm</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}

          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <View style={styles.specificationsSection}>
              <Text style={styles.sectionTitle}>Thông số kỹ thuật</Text>
              {Object.entries(product.specifications).map(([key, value]) => value && (
                <View key={key} style={styles.specItem}>
                  <Text style={styles.specKey}>{key}:</Text>
                  <Text style={styles.specValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>Đánh giá & Bình luận ({reviews.length})</Text>
            {isLoadingReviews ? (
              <ActivityIndicator color="#e83e8c" style={{ marginVertical: 20 }} />
            ) : reviews.length > 0 ? (
              <FlatList
                data={reviews}
                renderItem={renderReviewItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.reviewSeparator} />}
              />
            ) : (
              <Text style={styles.noReviewsText}>Chưa có đánh giá nào cho sản phẩm này.</Text>
            )}

            {user && hasUserPurchasedAndCompleted && !hasUserReviewed && (
              <View style={styles.addReviewSection}>
                <Text style={styles.addReviewTitle}>Viết đánh giá của bạn</Text>
                <View style={styles.starRatingInput}>
                  {[...Array(5)].map((_, index) => renderStar(index))}
                </View>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Chia sẻ cảm nhận của bạn..."
                  value={userComment}
                  onChangeText={setUserComment}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#adb5bd"
                />
                <TouchableOpacity
                  style={[styles.submitReviewButton, isSubmittingReview && styles.buttonDisabled]}
                  onPress={handleSubmitReview}
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitReviewButtonText}>Gửi đánh giá</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            {user && !hasUserPurchasedAndCompleted && !hasUserReviewed && (
                <Text style={styles.noticeText}>Bạn cần mua và xác nhận đã nhận sản phẩm này để có thể viết đánh giá.</Text>
            )}
             {user && hasUserReviewed && (
                <Text style={styles.noticeText}>Cảm ơn! Bạn đã đánh giá sản phẩm này.</Text>
            )}
            {!user && (
                <TouchableOpacity onPress={() => Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để viết đánh giá.')} style={styles.loginPromptButton}>
                    <Text style={styles.loginPromptText}>Đăng nhập để viết đánh giá</Text>
                </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Text style={styles.addToCartButtonText}>Thêm vào giỏ hàng ({getCartItemQuantity(productId)})</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// Styles (giữ nguyên)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  scrollContainer: { paddingBottom: 80 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  productImage: { width: '100%', height: Dimensions.get('window').width * 0.8, marginBottom: 15, backgroundColor: '#f0f0f0' },
  detailsContainer: { paddingHorizontal: 15, },
  productName: { fontSize: 24, fontWeight: 'bold', color: '#343a40', marginBottom: 5, },
  productBrand: { fontSize: 15, color: '#6c757d', marginBottom: 10, },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, },
  currentPrice: { fontSize: 22, fontWeight: 'bold', color: '#e83e8c', marginRight: 10, },
  oldPrice: { fontSize: 16, color: '#adb5bd', textDecorationLine: 'line-through', marginRight: 10, },
  discountBadgeText: { fontSize: 14, color: '#fff', backgroundColor: '#e83e8c', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, fontWeight: 'bold', },
  colorSelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap' },
  selectorLabel: { fontSize: 16, color: '#495057', marginRight: 10, fontWeight: '500'},
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#dee2e6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: { borderColor: '#e83e8c', borderWidth: 2.5, },
  colorCheckMark: { color: '#000', fontSize: 16, fontWeight: 'bold', },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, },
  quantityControls: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ced4da', borderRadius: 5, },
  quantityButton: { paddingHorizontal: 15, paddingVertical: 8, },
  quantityButtonText: { fontSize: 18, color: '#495057', fontWeight: 'bold'},
  quantityValue: { fontSize: 16, color: '#343a40', paddingHorizontal: 15, fontWeight: '500' },
  stockInfo: { fontSize: 13, color: '#28a745', marginLeft: 15, fontStyle: 'italic' },
  descriptionSection: { marginTop: 10, marginBottom: 20, },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#343a40', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5, },
  descriptionText: { fontSize: 15, color: '#495057', lineHeight: 22, },
  specificationsSection: { marginBottom: 20, },
  specItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', },
  specKey: { fontSize: 14, color: '#495057', fontWeight: '500', },
  specValue: { fontSize: 14, color: '#343a40', textAlign: 'right', flexShrink: 1},
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', },
  addToCartButton: { backgroundColor: '#e83e8c', paddingVertical: 15, borderRadius: 8, alignItems: 'center', },
  addToCartButtonText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold', },
  reviewsSection: { marginTop: 20, marginBottom: 20, },
  noReviewsText: { textAlign: 'center', color: '#6c757d', fontStyle: 'italic', marginTop: 15, },
  reviewItem: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 6, marginBottom: 10, borderWidth:1, borderColor:'#efefef' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, },
  reviewUserName: { fontSize: 15, fontWeight: 'bold', color: '#343a40', },
  starRating: { flexDirection: 'row', marginTop: 2, },
  starRatingInput: { flexDirection: 'row', marginBottom: 15, justifyContent: 'center' },
  starFilled: { fontSize: 28, color: '#ffc107', marginRight: 3, },
  starOutline: { fontSize: 28, color: '#e0e0e0', marginRight: 3, },
  starFilledSmall: { fontSize: 14, color: '#ffc107', },
  starOutlineSmall: { fontSize: 14, color: '#e0e0e0', },
  reviewComment: { fontSize: 14, color: '#495057', lineHeight: 20, marginBottom: 6, },
  reviewDate: { fontSize: 11, color: '#888', fontStyle: 'italic', textAlign: 'right' },
  reviewSeparator: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 5, },
  addReviewSection: { marginTop: 25, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#eee', },
  addReviewTitle: { fontSize: 17, fontWeight: '600', color: '#343a40', marginBottom: 15, textAlign: 'center' },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 10,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  submitReviewButton: { backgroundColor: '#28a745', paddingVertical: 12, borderRadius: 6, alignItems: 'center', },
  submitReviewButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', },
  buttonDisabled: { opacity: 0.7, },
  noticeText: {
    textAlign: 'center',
    color: '#17a2b8',
    fontStyle: 'italic',
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e7f7fa',
    borderRadius: 5,
  },
  loginPromptButton: {
    marginTop: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  loginPromptText: {
    color: '#007bff',
    fontSize: 15,
    textDecorationLine: 'underline'
  }
});

export default ProductDetailScreen;
