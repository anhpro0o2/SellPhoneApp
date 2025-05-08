import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert
} from 'react-native';
// Import kiểu Navigation prop từ App.tsx (Sẽ cập nhật App.tsx sau)
import type { PromotionsScreenNavProps } from '../../App'; // Đảm bảo đường dẫn đúng

// Kiểu dữ liệu cho một chương trình khuyến mãi
interface Promotion {
  id: string;
  title: string;
  description: string;
  imageUrl: string; // URL ảnh banner cho khuyến mãi
  discountCode?: string; // Mã giảm giá nếu có
  validUntil?: string; // Ngày hết hạn
  detailsUrl?: string; // Link chi tiết (nếu có)
}

// Dữ liệu khuyến mãi giả lập
const PROMOTIONS_DATA: Promotion[] = [
  {
    id: 'promo1',
    title: 'Giảm giá SỐC cuối tuần!',
    description: 'Giảm ngay 20% cho tất cả các dòng iPhone 16 Series. Áp dụng từ Thứ 6 đến Chủ Nhật tuần này. Nhanh tay kẻo lỡ!',
    imageUrl: 'https://tiki.vn/blog/wp-content/uploads/2024/09/iphone-16-sap-ra-mat-001.jpg',
    discountCode: 'WEEKEND20',
    validUntil: '12/05/2025',
  },
  {
    id: 'promo2',
    title: 'Mua Samsung tặng quà khủng',
    description: 'Nhận ngay tai nghe Galaxy Buds Pro trị giá 3.000.000đ khi mua Samsung Galaxy S24 Ultra. Số lượng có hạn.',
    imageUrl: 'https://cdn2.fptshop.com.vn/unsafe/828x0/filters:format(webp):quality(75)/tai_nghe_samsung_galaxy_buds_3_pro_r630_1_b907dc3341.jpg',
    validUntil: '31/05/2025',
  },
  {
    id: 'promo3',
    title: 'Trả góp 0% - Rinh ngay OPPO',
    description: 'Ưu đãi trả góp 0% lãi suất cho tất cả các sản phẩm OPPO dòng Reno và Find. Thủ tục đơn giản, duyệt hồ sơ nhanh chóng.',
    imageUrl: 'https://cdnv2.tgdd.vn/mwg-static/tgdd/Banner/9d/2f/9d2f4fb5ba62ea5d660e17d8d50f739f.png',
  },
  {
    id: 'promo4',
    title: 'Flash Sale Xiaomi - Giá hủy diệt!',
    description: 'Các mẫu điện thoại Xiaomi giảm giá lên đến 50% chỉ trong 3 ngày. Đừng bỏ lỡ cơ hội vàng!',
    imageUrl: 'https://cdnv2.tgdd.vn/mwg-static/tgdd/Banner/34/60/34608c8f3a69f260eabde408470f881e.png',
    validUntil: '10/05/2025',
    discountCode: 'XIAOMI50',
  },
];

const { width: screenWidth } = Dimensions.get('window');

// Component hiển thị từng mục khuyến mãi
const PromotionItem: React.FC<{ item: Promotion; onPress: () => void }> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.promotionItem} onPress={onPress} activeOpacity={0.8}>
    <Image source={{ uri: item.imageUrl }} style={styles.promotionImage} resizeMode="cover" />
    <View style={styles.promotionTextContainer}>
      <Text style={styles.promotionTitle}>{item.title}</Text>
      <Text style={styles.promotionDescription} numberOfLines={3}>{item.description}</Text>
      {item.discountCode && (
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Mã giảm giá:</Text>
          <Text style={styles.discountCodeText}>{item.discountCode}</Text>
        </View>
      )}
      {item.validUntil && <Text style={styles.validUntilText}>Thời hạn: {item.validUntil}</Text>}
    </View>
  </TouchableOpacity>
);

const PromotionsScreen: React.FC<PromotionsScreenNavProps> = ({ navigation }) => {
  const handlePromotionPress = (promotion: Promotion) => {
    console.log('Promotion pressed:', promotion.title);
    // TODO: Điều hướng đến chi tiết khuyến mãi hoặc áp dụng mã (nếu có)
    // Hoặc mở một WebView nếu có detailsUrl
    Alert.alert(promotion.title, `${promotion.description}\n${promotion.discountCode ? `Mã: ${promotion.discountCode}` : ''}`);
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* Header đã được cấu hình trong App.tsx, không cần thêm ở đây trừ khi muốn tùy chỉnh riêng */}
      <FlatList
        data={PROMOTIONS_DATA}
        renderItem={({ item }) => <PromotionItem item={item} onPress={() => handlePromotionPress(item)} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Hiện chưa có chương trình khuyến mãi nào.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f8', // Màu nền nhạt cho toàn màn hình
  },
  listContainer: {
    padding: 15,
  },
  promotionItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12, // Bo góc nhiều hơn
    marginBottom: 20,
    elevation: 4, // Tăng độ đổ bóng
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  promotionImage: {
    width: '100%',
    height: screenWidth * 0.5, // Chiều cao ảnh banner
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  promotionTextContainer: {
    padding: 15,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  promotionDescription: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 10,
    lineHeight: 20,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  codeLabel: {
    fontSize: 13,
    color: '#777777',
    marginRight: 5,
  },
  discountCodeText: {
    fontSize: 14,
    color: '#e83e8c',
    fontWeight: 'bold',
    backgroundColor: '#fdeff5', // Nền nhẹ cho mã
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  validUntilText: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50, // Đẩy xuống chút nếu danh sách trống
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
  },
});

export default PromotionsScreen;
