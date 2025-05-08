import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

// Cập nhật CartItem để có trường 'selected'
export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  stock?: number;
  selected: boolean; // <-- Thêm trường này, mặc định là true khi thêm vào giỏ
}

// Cập nhật CartContextType
interface CartContextType {
  cartItems: CartItem[];
  addItemToCart: (product: ProductToAdd, quantity?: number) => void;
  removeItemFromCart: (productId: string) => void;
  updateItemQuantity: (productId: string, newQuantity: number) => void;
  clearCart: () => void;
  toggleItemSelected: (productId: string) => void; // <-- Hàm mới
  selectAllItems: () => void; // <-- Hàm mới
  deselectAllItems: () => void; // <-- Hàm mới
  getSelectedItems: () => CartItem[]; // <-- Hàm mới
  getCartTotalQuantity: (onlySelected?: boolean) => number; // Thêm tùy chọn chỉ tính sản phẩm đã chọn
  getCartTotalPrice: (onlySelected?: boolean) => number; // Thêm tùy chọn chỉ tính sản phẩm đã chọn
  isCartLoading: boolean;
  areAllItemsSelected: () => boolean; // <-- Hàm mới
}

interface ProductToAdd {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    stock?: number;
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
    return userId ? `@MyAppSellPhone:cartItems_v2:${userId}` : null; // Thay đổi key nếu cấu trúc CartItem thay đổi
  };

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
            // Đảm bảo tất cả item đều có trường 'selected', mặc định là true nếu thiếu
            const initializedCartItems = savedCartItems.map(item => ({
              ...item,
              selected: item.selected === undefined ? true : item.selected,
            }));
            setCartItems(initializedCartItems);
          } else {
            setCartItems([]);
          }
        } catch (e) { console.error('Failed to load cart', e); setCartItems([]); }
        finally { setIsCartLoading(false); }
      } else {
        setCartItems([]);
        setIsCartLoading(false);
      }
    };
    loadCart();
  }, [user]);

  useEffect(() => {
    const saveCart = async () => {
      if (user && user.uid && !isCartLoading) {
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

  const addItemToCart = (product: ProductToAdd, quantity: number = 1) => {
    if (!user) { Alert.alert("Lỗi", "Vui lòng đăng nhập."); return; }
    if (!product || !product.id || quantity <= 0) return;
    if (product.stock !== undefined && product.stock <= 0) { Alert.alert("Hết hàng", "Sản phẩm này đã hết hàng."); return; }

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.id === product.id);
      let newItems = [...prevItems];
      if (existingItemIndex > -1) {
        const existingItem = newItems[existingItemIndex];
        let newQuantity = existingItem.quantity + quantity;
        if (product.stock !== undefined && newQuantity > product.stock) {
          Alert.alert("Số lượng vượt quá tồn kho", `Chỉ còn ${product.stock} sản phẩm "${product.name}".`);
          newQuantity = product.stock;
        }
        newItems[existingItemIndex] = { ...existingItem, quantity: newQuantity, stock: product.stock, selected: existingItem.selected }; // Giữ nguyên trạng thái selected
      } else {
        let newQuantity = quantity;
        if (product.stock !== undefined && newQuantity > product.stock) {
          Alert.alert("Số lượng vượt quá tồn kho", `Chỉ còn ${product.stock} sản phẩm "${product.name}".`);
          newQuantity = product.stock;
        }
        if (newQuantity > 0) {
          newItems.push({
            id: product.id, name: product.name, price: product.price,
            imageUrl: product.imageUrl, quantity: newQuantity, stock: product.stock,
            selected: true, // <-- Mặc định là được chọn khi thêm mới
          });
        }
      }
      return newItems;
    });
  };

  const removeItemFromCart = (productId: string) => { /* ... giữ nguyên ... */
    if (!user) return;
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateItemQuantity = (productId: string, newQuantity: number) => { /* ... giữ nguyên, có thể thêm kiểm tra stock ... */
    if (!user) return;
    setCartItems(prevItems => {
      const itemToUpdate = prevItems.find(item => item.id === productId);
      if (!itemToUpdate) return prevItems;
      if (itemToUpdate.stock !== undefined && newQuantity > itemToUpdate.stock) {
        Alert.alert("Số lượng vượt quá tồn kho", `Chỉ còn ${itemToUpdate.stock} sản phẩm "${itemToUpdate.name}".`);
        newQuantity = itemToUpdate.stock;
      }
      if (newQuantity <= 0) { return prevItems.filter(item => item.id !== productId); }
      return prevItems.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item );
    });
  };

  const clearCart = () => { /* ... giữ nguyên ... */
    if (!user) return;
    setCartItems([]);
    if (user && user.uid) {
        const storageKey = getCartStorageKey(user.uid);
        if (storageKey) { AsyncStorage.removeItem(storageKey).catch(e => console.error("Failed to clear cart from AsyncStorage", e));}
    }
  };

  // --- Hàm mới để thay đổi trạng thái selected ---
  const toggleItemSelected = (productId: string) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // --- Hàm mới để chọn tất cả ---
  const selectAllItems = () => {
    setCartItems(prevItems => prevItems.map(item => ({ ...item, selected: true })));
  };

  // --- Hàm mới để bỏ chọn tất cả ---
  const deselectAllItems = () => {
    setCartItems(prevItems => prevItems.map(item => ({ ...item, selected: false })));
  };

  // --- Hàm mới để lấy các item đã chọn ---
  const getSelectedItems = (): CartItem[] => {
    return cartItems.filter(item => item.selected);
  };

  // --- Hàm kiểm tra tất cả item có được chọn không ---
  const areAllItemsSelected = useMemo(() => {
    if (cartItems.length === 0) return false; // Không có gì để chọn
    return cartItems.every(item => item.selected);
  }, [cartItems]);


  // Cập nhật hàm tính tổng số lượng
  const getCartTotalQuantity = useMemo(() => (onlySelected: boolean = false) => {
    const itemsToConsider = onlySelected ? cartItems.filter(item => item.selected) : cartItems;
    return itemsToConsider.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  // Cập nhật hàm tính tổng tiền
  const getCartTotalPrice = useMemo(() => (onlySelected: boolean = false) => {
    const itemsToConsider = onlySelected ? cartItems.filter(item => item.selected) : cartItems;
    return itemsToConsider.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cartItems]);


  const cartContextValue: CartContextType = {
    cartItems, addItemToCart, removeItemFromCart, updateItemQuantity, clearCart,
    toggleItemSelected, selectAllItems, deselectAllItems, getSelectedItems,
    getCartTotalQuantity: (onlySelected = false) => getCartTotalQuantity(onlySelected),
    getCartTotalPrice: (onlySelected = false) => getCartTotalPrice(onlySelected),
    isCartLoading,
    areAllItemsSelected: () => areAllItemsSelected,
  };

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
