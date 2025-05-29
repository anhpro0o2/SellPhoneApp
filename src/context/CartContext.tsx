import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext'; // Đảm bảo đường dẫn đúng

// Kiểu dữ liệu cho một item trong giỏ hàng
export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  stock?: number;
  selected: boolean;
  warrantyPeriodInMonths?: number; // Thêm trường này để lưu thông tin bảo hành
}

// Interface cho sản phẩm khi thêm vào giỏ hàng
// Đã có quantity?: number; từ code bạn cung cấp, điều này tốt
interface ProductToAdd {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    stock?: number;
    quantity?: number; // Số lượng muốn thêm, được truyền từ ProductDetailScreen
    warrantyPeriodInMonths?: number; // Thêm thông tin bảo hành
}

// Cập nhật CartContextType
interface CartContextType {
  cartItems: CartItem[];
  addItemToCart: (product: ProductToAdd) => void; // Sửa: chỉ cần 1 tham số
  removeItemFromCart: (productId: string) => void;
  updateItemQuantity: (productId: string, newQuantity: number) => void;
  clearCart: () => void;
  toggleItemSelected: (productId: string) => void;
  selectAllItems: () => void;
  deselectAllItems: () => void;
  getSelectedItems: () => CartItem[];
  getCartItemQuantity: (productId: string) => number;
  getCartTotalQuantity: (onlySelected?: boolean) => number;
  getCartTotalPrice: (onlySelected?: boolean) => number;
  isCartLoading: boolean;
  areAllItemsSelected: () => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartLoading, setIsCartLoading] = useState<boolean>(true);
  const { user } = useAuth();

  const getCartStorageKey = (userId: string | undefined): string | null => {
    return userId ? `@MyAppSellPhone:cartItems_v3:${userId}` : null; // Cân nhắc đổi key nếu cấu trúc CartItem thay đổi đáng kể
  };

  // Load cart from storage
  useEffect(() => {
    const loadCart = async () => {
      if (user && user.uid) {
        const storageKey = getCartStorageKey(user.uid);
        if (!storageKey) return;
        setIsCartLoading(true);
        try {
          const savedCartJson = await AsyncStorage.getItem(storageKey);
          if (savedCartJson !== null) {
            const savedCartItems: CartItem[] = JSON.parse(savedCartJson);
            const initializedCartItems = savedCartItems.map(item => ({
              ...item,
              selected: item.selected === undefined ? true : item.selected,
              // Đảm bảo các trường mới có giá trị mặc định nếu tải từ storage cũ
              warrantyPeriodInMonths: item.warrantyPeriodInMonths || undefined,
            }));
            setCartItems(initializedCartItems);
          } else {
            setCartItems([]);
          }
        } catch (e) { console.error('Failed to load cart', e); setCartItems([]); }
        finally { setIsCartLoading(false); }
      } else {
        setCartItems([]); // Xóa giỏ hàng khi người dùng đăng xuất
        setIsCartLoading(false);
      }
    };
    loadCart();
  }, [user]);

  // Save cart to storage
  useEffect(() => {
    const saveCart = async () => {
      if (user && user.uid && !isCartLoading) { // Chỉ lưu khi không loading và có user
        const storageKey = getCartStorageKey(user.uid);
        if (!storageKey) return;
        try {
          const cartJson = JSON.stringify(cartItems);
          await AsyncStorage.setItem(storageKey, cartJson);
        } catch (e) { console.error('Failed to save cart', e); }
      }
    };
    if (!isCartLoading) { saveCart(); }
  }, [cartItems, user, isCartLoading]);

  // Sửa addItemToCart để sử dụng product.quantity
  const addItemToCart = (product: ProductToAdd) => {
    if (!user) { Alert.alert("Lỗi", "Vui lòng đăng nhập để thêm vào giỏ hàng."); return; }

    const quantityToAdd = product.quantity || 1; // Lấy quantity từ product object, nếu không có thì mặc định là 1

    if (!product || !product.id || quantityToAdd <= 0) {
        console.warn('[CartContext] addItemToCart: Invalid product or quantityToAdd', product, quantityToAdd);
        return;
    }
    if (product.stock !== undefined && product.stock <= 0) {
        Alert.alert("Hết hàng", "Sản phẩm này đã hết hàng.");
        return;
    }

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.id === product.id);
      let newItems = [...prevItems];
      if (existingItemIndex > -1) { // Sản phẩm đã có trong giỏ
        const existingItem = newItems[existingItemIndex];
        let updatedQuantity = existingItem.quantity + quantityToAdd;

        if (product.stock !== undefined && updatedQuantity > product.stock) {
          Alert.alert("Số lượng vượt quá tồn kho", `Bạn chỉ có thể mua tối đa ${product.stock} sản phẩm "${product.name}". Hiện tại trong giỏ đã có ${existingItem.quantity}.`);
          updatedQuantity = product.stock; // Giới hạn số lượng bằng tồn kho
        }
        newItems[existingItemIndex] = { ...existingItem, quantity: updatedQuantity, stock: product.stock, selected: existingItem.selected };
      } else { // Sản phẩm mới
        let newQuantityForItem = quantityToAdd;
        if (product.stock !== undefined && newQuantityForItem > product.stock) {
          Alert.alert("Số lượng vượt quá tồn kho", `Chỉ còn ${product.stock} sản phẩm "${product.name}".`);
          newQuantityForItem = product.stock;
        }
        if (newQuantityForItem > 0) {
          newItems.push({
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            quantity: newQuantityForItem,
            stock: product.stock,
            selected: true, // Mặc định là được chọn khi thêm mới
            warrantyPeriodInMonths: product.warrantyPeriodInMonths, // Lưu thông tin bảo hành
          });
        }
      }
      return newItems;
    });
  };

  const removeItemFromCart = (productId: string) => {
    if (!user) return;
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    if (!user) return;
    setCartItems(prevItems => {
      const itemToUpdate = prevItems.find(item => item.id === productId);
      if (!itemToUpdate) return prevItems;

      if (itemToUpdate.stock !== undefined && newQuantity > itemToUpdate.stock) {
        Alert.alert("Số lượng vượt quá tồn kho", `Chỉ còn ${itemToUpdate.stock} sản phẩm "${itemToUpdate.name}".`);
        newQuantity = itemToUpdate.stock;
      }

      if (newQuantity <= 0) {
        return prevItems.filter(item => item.id !== productId); // Xóa nếu số lượng <= 0
      }
      return prevItems.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const clearCart = () => {
    if (!user) return;
    setCartItems([]);
    if (user && user.uid) {
      const storageKey = getCartStorageKey(user.uid);
      if (storageKey) { AsyncStorage.removeItem(storageKey).catch(e => console.error("Failed to clear cart from AsyncStorage", e));}
    }
  };

  const toggleItemSelected = (productId: string) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAllItems = () => {
    setCartItems(prevItems => prevItems.map(item => ({ ...item, selected: true })));
  };

  const deselectAllItems = () => {
    setCartItems(prevItems => prevItems.map(item => ({ ...item, selected: false })));
  };

  const getSelectedItems = (): CartItem[] => {
    return cartItems.filter(item => item.selected);
  };

  const getCartItemQuantity = useCallback((productId: string): number => {
      const item = cartItems.find(item => item.id === productId);
      return item ? item.quantity : 0;
  }, [cartItems]);

  const getCartTotalQuantity = useCallback((onlySelected: boolean = false): number => {
    const itemsToConsider = onlySelected ? cartItems.filter(item => item.selected) : cartItems;
    return itemsToConsider.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const getCartTotalPrice = useCallback((onlySelected: boolean = false): number => {
    const itemsToConsider = onlySelected ? cartItems.filter(item => item.selected) : cartItems;
    return itemsToConsider.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cartItems]);

  const areAllItemsSelected = useCallback((): boolean => {
    if (cartItems.length === 0) return false;
    return cartItems.every(item => item.selected);
  }, [cartItems]);

  // Sửa cách cung cấp các hàm trong cartContextValue
  const cartContextValue: CartContextType = useMemo(() => ({
    cartItems,
    addItemToCart, // Hàm đã được sửa
    removeItemFromCart,
    updateItemQuantity,
    clearCart,
    toggleItemSelected,
    selectAllItems,
    deselectAllItems,
    getSelectedItems,
    getCartItemQuantity,
    getCartTotalQuantity,
    getCartTotalPrice,
    isCartLoading,
    areAllItemsSelected,
  }), [
      cartItems,
      isCartLoading,
      getCartItemQuantity,
      getCartTotalQuantity,
      getCartTotalPrice,
      areAllItemsSelected
      // Các hàm như addItemToCart, removeItemFromCart, etc. đã được định nghĩa bên ngoài useMemo
      // và chúng sử dụng setCartItems, nên chúng ổn định nếu không có dependencies thay đổi thường xuyên.
      // Nếu bạn muốn tối ưu hơn, có thể bọc chúng trong useCallback.
  ]);

  return (
    <CartContext.Provider value={cartContextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
