import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar
} from 'react-native';
import type { ProductDetailScreenNavProps } from '../../App';
import productsJsonData from '../data/products.json';
import { useCart } from '../context/CartContext';

// --- Kiểu Product ---
interface Product { id: string; name: string; brand?: string; price: number; oldPrice?: number | null; imageUrl: string; description?: string; stock?: number; discountPercent?: number | null; specifications?: { [key: string]: string | undefined }; colors?: string[]; }

const { width: screenWidth } = Dimensions.get('window');

const ProductDetailScreen: React.FC<ProductDetailScreenNavProps> = ({ route, navigation }) => {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { addItemToCart } = useCart();

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const foundProduct = productsJsonData.find(p => p.id === productId);
    if (foundProduct) {
      const processedProduct: Product = {
        id: foundProduct.id, name: foundProduct.name, price: Number(foundProduct.price) || 0, imageUrl: foundProduct.imageUrl,
        brand: typeof foundProduct.brand === 'string' ? foundProduct.brand : undefined,
        oldPrice: typeof foundProduct.oldPrice === 'number' ? foundProduct.oldPrice : null,
        description: typeof foundProduct.description === 'string' ? foundProduct.description : undefined,
        stock: typeof foundProduct.stock === 'number' ? foundProduct.stock : undefined,
        discountPercent: typeof foundProduct.discountPercent === 'number' ? foundProduct.discountPercent : null,
        specifications: typeof foundProduct.specifications === 'object' && foundProduct.specifications !== null ? foundProduct.specifications : undefined,
        colors: Array.isArray(foundProduct.colors) ? foundProduct.colors.filter((c: any): c is string => typeof c === 'string') : undefined,
      };
      setProduct(processedProduct);
    } else { setError('Không tìm thấy sản phẩm.'); }
    setIsLoading(false);
  }, [productId]);

  const formatPrice = (priceInput: number | null | undefined): string => { if (typeof priceInput === 'number' && !isNaN(priceInput)) { return priceInput.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }); } return ''; };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.stock === undefined || product.stock <= 0) { Alert.alert("Hết hàng", "Sản phẩm này hiện đã hết hàng."); return; }
    const productToAdd = { id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, stock: product.stock };
    addItemToCart(productToAdd, 1);
    Alert.alert("Thành công", `Đã thêm ${product.name} vào giỏ hàng.`);
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (product.stock === undefined || product.stock <= 0) { Alert.alert("Hết hàng", "Sản phẩm này hiện đã hết hàng."); return; }
    const productToAdd = { id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, stock: product.stock };
    addItemToCart(productToAdd, 1);
    console.log(`Buying now: ${product.name}. Navigating to Cart.`);
    navigation.navigate('Cart');
  };

  if (isLoading) { return ( <View style={styles.centered}><ActivityIndicator size="large" color="#AC0013" /></View> ); }
  if (error) { return ( <View style={styles.centered}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backButtonText}>Quay lại</Text></TouchableOpacity></View> ); }
  if (!product) { return ( <View style={styles.centered}><Text style={styles.errorText}>Không tìm thấy thông tin sản phẩm.</Text><TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backButtonText}>Quay lại</Text></TouchableOpacity></View> ); }

  const isOutOfStock = product.stock === undefined || product.stock <= 0;

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="contain" />
        <View style={styles.infoContainer}>
          {product.brand && <Text style={styles.brandText}>{product.brand}</Text>}
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>{formatPrice(product.price)}</Text>
            {product.oldPrice != null && <Text style={styles.oldPrice}>{formatPrice(product.oldPrice)}</Text>}
            {typeof product.discountPercent === 'number' && !isNaN(product.discountPercent) && <View style={styles.discountTag}><Text style={styles.discountTagText}>-{product.discountPercent}%</Text></View>}
          </View>
          {product.description && <View style={styles.sectionContainer}><Text style={styles.sectionTitle}>Mô tả sản phẩm</Text><Text style={styles.descriptionText}>{product.description}</Text></View>}
          {product.specifications && <View style={styles.sectionContainer}><Text style={styles.sectionTitle}>Thông số kỹ thuật</Text>{Object.entries(product.specifications).map(([key, value]) => ( value ? <View key={key} style={styles.specRow}><Text style={styles.specKey}>{key}:</Text><Text style={styles.specValue}>{value}</Text></View> : null ))}</View>}
          {product.colors && product.colors.length > 0 && <View style={styles.sectionContainer}><Text style={styles.sectionTitle}>Màu sắc</Text><View style={styles.colorContainer}>{product.colors.map((color) => (<TouchableOpacity key={color} style={styles.colorOption}><Text style={styles.colorText}>{color}</Text></TouchableOpacity>))}</View></View>}
        </View>
      </ScrollView>
      {/* --- Footer với 2 nút --- */}
      <View style={styles.footer}>
        <View style={styles.footerButtonContainer}>
          {/* Nút Thêm vào giỏ hàng */}
          <TouchableOpacity
            style={[styles.footerButton, styles.addToCartButton, isOutOfStock && styles.disabledButton]}
            onPress={handleAddToCart}
            disabled={isOutOfStock}
          >
            {/* Sửa style cho Text ở đây */}
            <Text style={[styles.footerButtonText, styles.addToCartButtonText, isOutOfStock && styles.disabledButtonText]}>
                 {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
            </Text>
          </TouchableOpacity>
          {/* Nút Mua ngay */}
          <TouchableOpacity
            style={[styles.footerButton, styles.buyNowButton, isOutOfStock && styles.disabledButton]}
            onPress={handleBuyNow}
            disabled={isOutOfStock}
          >
             {/* Sửa style cho Text ở đây */}
             <Text style={[styles.footerButtonText, styles.buyNowButtonText, isOutOfStock && styles.disabledButtonText]}>
                 {isOutOfStock ? 'Hết hàng' : 'Mua ngay'}
             </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff', },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center', marginBottom: 20, },
  backButton: { marginTop: 15, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#AC0013', borderRadius: 5, },
  backButtonText: { color: '#fff', fontSize: 16, },
  scrollView: { flex: 1, },
  productImage: { width: screenWidth, height: screenWidth * 0.8, backgroundColor: '#f8f9fa', },
  infoContainer: { padding: 20, },
  brandText: { fontSize: 14, color: '#6c757d', marginBottom: 5, },
  productName: { fontSize: 22, fontWeight: 'bold', color: '#343a40', marginBottom: 10, lineHeight: 30, },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 15, flexWrap: 'wrap' },
  currentPrice: { fontSize: 24, fontWeight: 'bold', color: '#AC0013', marginRight: 10, },
  oldPrice: { fontSize: 16, color: '#6c757d', textDecorationLine: 'line-through', marginRight: 10, },
  discountTag: { backgroundColor: '#AC0013', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  discountTagText: { color: '#fff', fontSize: 12, fontWeight: 'bold', },
  sectionContainer: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15, },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#343a40', },
  descriptionText: { fontSize: 15, lineHeight: 24, color: '#495057', },
  specRow: { flexDirection: 'row', marginBottom: 8, },
  specKey: { fontWeight: 'bold', marginRight: 5, color: '#495057', width: 120, },
  specValue: { flex: 1, color: '#495057', },
  colorContainer: { flexDirection: 'row', flexWrap: 'wrap', },
  colorOption: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 15, marginRight: 10, marginBottom: 10, },
  colorText: { fontSize: 14, color: '#495057', },
  footer: { paddingVertical: 10, paddingHorizontal: 15, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#ffffff', },
  footerButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', },
  footerButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, marginHorizontal: 5, },
  addToCartButton: { backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#AC0013', },
  buyNowButton: { backgroundColor: '#AC0013', },
  footerButtonText: { fontSize: 16, fontWeight: 'bold', /* Màu chữ sẽ được định nghĩa riêng */ },
  // --- Style riêng cho Text của từng nút ---
  addToCartButtonText: {
    color: '#AC0013', // Màu chữ cho nút "Thêm vào giỏ"
  },
  buyNowButtonText: {
    color: '#ffffff', // Màu chữ cho nút "Mua ngay"
  },
  disabledButton: { // Style cho nút khi bị vô hiệu hóa
    backgroundColor: '#cccccc',
    borderColor: '#cccccc',
  },
  disabledButtonText: { // Style cho text của nút khi bị vô hiệu hóa
    color: '#a0a0a0',
  }
});

export default ProductDetailScreen;
