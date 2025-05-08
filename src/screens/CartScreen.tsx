import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator, // Đã thêm lại import này
} from 'react-native';
import { useCart, CartItem } from '../context/CartContext'; // Đảm bảo đường dẫn đúng
import type { CartScreenNavProps } from '../../App'; // Đảm bảo đường dẫn đúng

// --- Component Checkbox đơn giản ---
const CustomCheckbox: React.FC<{ value: boolean; onValueChange: () => void; disabled?: boolean }> = ({ value, onValueChange, disabled }) => (
  <TouchableOpacity onPress={onValueChange} style={[styles.checkboxBase, value && styles.checkboxChecked, disabled && styles.checkboxDisabled]} disabled={disabled}>
    {value && <Text style={styles.checkboxCheckmark}>✓</Text>}
  </TouchableOpacity>
);

// --- Component hiển thị từng sản phẩm trong giỏ hàng ---
const CartItemCard: React.FC<{ item: CartItem }> = ({ item }) => {
  const { updateItemQuantity, removeItemFromCart, toggleItemSelected, cartItems } = useCart();
  const currentProductInCart = cartItems.find(ci => ci.id === item.id);
  const stockAvailable = currentProductInCart?.stock;

  const handleIncreaseQuantity = () => {
    if (stockAvailable !== undefined && item.quantity >= stockAvailable) {
        Alert.alert("Hết hàng", `Chỉ có ${stockAvailable} sản phẩm "${item.name}" trong kho.`);
        return;
    }
    updateItemQuantity(item.id, item.quantity + 1);
  };

  const handleDecreaseQuantity = () => {
    if (item.quantity > 1) {
      updateItemQuantity(item.id, item.quantity - 1);
    } else {
      confirmRemoveItem();
    }
  };

  const confirmRemoveItem = () => { Alert.alert( "Xóa sản phẩm", `Bạn có chắc muốn xóa ${item.name} khỏi giỏ hàng?`, [ { text: "Hủy", style: "cancel" }, { text: "Xóa", onPress: () => removeItemFromCart(item.id), style: 'destructive' } ] ); };
  const formatPrice = (price: number): string => { return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }); };

  return (
    <View style={styles.cartItemContainer}>
      <CustomCheckbox value={item.selected} onValueChange={() => toggleItemSelected(item.id)} />
      <Image source={{ uri: item.imageUrl }} style={styles.cartItemImage} resizeMode="contain" />
      <View style={styles.cartItemDetails}>
        <Text style={styles.cartItemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>{formatPrice(item.price)}</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity style={styles.quantityButton} onPress={handleDecreaseQuantity}><Text style={styles.quantityButtonText}>-</Text></TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity style={styles.quantityButton} onPress={handleIncreaseQuantity}><Text style={styles.quantityButtonText}>+</Text></TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={confirmRemoveItem}><Text style={styles.removeButtonText}>✕</Text></TouchableOpacity>
    </View>
  );
};

// --- Component Màn hình Giỏ hàng chính ---
const CartScreen: React.FC<CartScreenNavProps> = ({ navigation }) => {
  const {
    cartItems, getCartTotalPrice, clearCart, selectAllItems,
    deselectAllItems, areAllItemsSelected, getSelectedItems, isCartLoading
  } = useCart();

  const totalPriceOfSelectedItems = getCartTotalPrice(true);

  // --- SỬA HÀM NÀY ---
  const handleCheckout = () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        Alert.alert("Chưa chọn sản phẩm", "Vui lòng chọn ít nhất một sản phẩm để thanh toán.");
        return;
    }
    console.log('Proceeding to checkout with selected items:', selectedItems);
    console.log('Total price for selected items:', totalPriceOfSelectedItems);
    // Alert.alert("Thông báo", `Thanh toán ${selectedItems.length} sản phẩm. Chức năng đang phát triển.`); // Tạm thời comment dòng này
    // Điều hướng đến màn hình Nhập địa chỉ giao hàng
    navigation.navigate('ShippingAddress'); // <-- BỎ COMMENT VÀ ĐẢM BẢO ĐÚNG
  };
  // --- KẾT THÚC SỬA ---

  const confirmClearCart = () => { Alert.alert( "Xóa giỏ hàng", `Bạn có chắc muốn xóa tất cả sản phẩm khỏi giỏ hàng?`, [ { text: "Hủy", style: "cancel" }, { text: "Xóa", onPress: clearCart, style: 'destructive' } ] ); };
  const handleToggleSelectAll = () => { if (areAllItemsSelected()) { deselectAllItems(); } else { selectAllItems(); } };

  if (isCartLoading) { return ( <View style={styles.centeredLoading}><ActivityIndicator size="large" color="#AC0013" /></View> ); }

  return (
    <View style={styles.safeArea}>
      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Giỏ hàng của bạn đang trống.</Text>
          <TouchableOpacity style={styles.continueShoppingButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.continueShoppingText}>Tiếp tục mua sắm</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={({ item }) => <CartItemCard item={item} />}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <TouchableOpacity onPress={handleToggleSelectAll} style={styles.selectAllContainer}>
                    <CustomCheckbox value={areAllItemsSelected()} onValueChange={handleToggleSelectAll} />
                    <Text style={styles.selectAllText}>Chọn tất cả ({cartItems.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmClearCart} style={styles.clearCartButton}>
                    <Text style={styles.clearCartText}>Xóa tất cả</Text>
                </TouchableOpacity>
              </View>
            }
          />
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Tổng cộng ({getSelectedItems().length} sản phẩm):</Text>
              <Text style={styles.totalPrice}>{totalPriceOfSelectedItems.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, getSelectedItems().length === 0 && styles.checkoutButtonDisabled]}
              onPress={handleCheckout}
              disabled={getSelectedItems().length === 0}
            >
              <Text style={styles.checkoutButtonText}>Tiến hành thanh toán</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

// --- Styles (Giữ nguyên) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa', },
  centeredLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  emptyText: { fontSize: 18, color: '#6c757d', marginBottom: 20, },
  continueShoppingButton: { backgroundColor: '#AC0013', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8, },
  continueShoppingText: { color: '#fff', fontSize: 16, fontWeight: 'bold', },
  listContainer: { paddingVertical: 10, paddingHorizontal: 15, },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingVertical: 5, },
  selectAllContainer: { flexDirection: 'row', alignItems: 'center', },
  selectAllText: { marginLeft: 8, fontSize: 14, color: '#343a40', },
  clearCartButton: { paddingVertical: 5, },
  clearCartText: { color: '#dc3545', fontSize: 13, },
  cartItemContainer: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 8, padding: 15, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, alignItems: 'center', },
  checkboxBase: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#AC0013', borderRadius: 4, marginRight: 15, },
  checkboxChecked: { backgroundColor: '#AC0013', },
  checkboxDisabled: { borderColor: '#cccccc', backgroundColor: '#e0e0e0' },
  checkboxCheckmark: { color: 'white', fontWeight: 'bold', fontSize: 12, },
  cartItemImage: { width: 60, height: 60, marginRight: 15, borderWidth: 1, borderColor: '#eee', borderRadius: 4, },
  cartItemDetails: { flex: 1, justifyContent: 'space-between', },
  cartItemName: { fontSize: 14, fontWeight: 'bold', color: '#343a40', marginBottom: 4, },
  cartItemPrice: { fontSize: 13, color: '#AC0013', fontWeight: '600', marginBottom: 6, },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', },
  quantityButton: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 4, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  quantityButtonText: { fontSize: 16, fontWeight: 'bold', color: '#495057', },
  quantityText: { fontSize: 15, fontWeight: 'bold', marginHorizontal: 12, color: '#343a40', minWidth: 20, textAlign: 'center', },
  removeButton: { padding: 8, marginLeft: 10, },
  removeButtonText: { fontSize: 16, color: '#dc3545', fontWeight: 'bold', },
  footer: { borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#ffffff', paddingVertical: 15, paddingHorizontal: 20, },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, },
  totalLabel: { fontSize: 16, color: '#6c757d', },
  totalPrice: { fontSize: 18, fontWeight: 'bold', color: '#AC0013', },
  checkoutButton: { backgroundColor: '#AC0013', paddingVertical: 15, borderRadius: 8, alignItems: 'center', },
  checkoutButtonDisabled: { backgroundColor: '#AC0013', },
  checkoutButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', },
});

export default CartScreen;
