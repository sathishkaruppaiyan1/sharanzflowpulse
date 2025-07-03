
export interface Order {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  items: OrderItem[];
  total: string;
  status: 'new' | 'processing' | 'printed' | 'packed' | 'shipped' | 'delivered';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  date: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingNumber?: string;
  carrier?: 'frenchexpress' | 'delhivery';
  notes?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: string;
  image?: string;
}

// Simulate order data that would come from Shopify API
const generateMockOrders = (): Order[] => {
  const customers = [
    { name: 'John Doe', email: 'john.doe@example.com', phone: '+91-9876543210' },
    { name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+91-9876543211' },
    { name: 'Mike Johnson', email: 'mike.johnson@example.com', phone: '+91-9876543212' },
    { name: 'Sarah Wilson', email: 'sarah.wilson@example.com', phone: '+91-9876543213' },
    { name: 'David Brown', email: 'david.brown@example.com', phone: '+91-9876543214' },
    { name: 'Lisa Davis', email: 'lisa.davis@example.com', phone: '+91-9876543215' },
    { name: 'Tom Anderson', email: 'tom.anderson@example.com', phone: '+91-9876543216' },
    { name: 'Emma Thompson', email: 'emma.thompson@example.com', phone: '+91-9876543217' },
    { name: 'Chris Lee', email: 'chris.lee@example.com', phone: '+91-9876543218' },
    { name: 'Anna Garcia', email: 'anna.garcia@example.com', phone: '+91-9876543219' },
  ];

  const products = [
    { name: 'Wireless Headphones', sku: 'WH-001', price: '$89.99' },
    { name: 'Bluetooth Speaker', sku: 'BS-002', price: '$45.99' },
    { name: 'Phone Case', sku: 'PC-003', price: '$19.99' },
    { name: 'USB Cable', sku: 'UC-004', price: '$12.99' },
    { name: 'Power Bank', sku: 'PB-005', price: '$34.99' },
    { name: 'Screen Protector', sku: 'SP-006', price: '$9.99' },
    { name: 'Car Charger', sku: 'CC-007', price: '$24.99' },
    { name: 'Gaming Mouse', sku: 'GM-008', price: '$59.99' },
    { name: 'Keyboard', sku: 'KB-009', price: '$79.99' },
    { name: 'Monitor Stand', sku: 'MS-010', price: '$39.99' },
  ];

  const statuses: Order['status'][] = ['new', 'processing', 'printed', 'packed', 'shipped'];
  const priorities: Order['priority'][] = ['low', 'normal', 'high', 'urgent'];
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Hyderabad'];

  return Array.from({ length: 50 }, (_, index) => {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items: OrderItem[] = [];
    let totalAmount = 0;

    for (let i = 0; i < numItems; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const price = parseFloat(product.price.replace('$', ''));
      totalAmount += price * quantity;
      
      items.push({
        id: `item-${index}-${i}`,
        name: product.name,
        sku: product.sku,
        quantity,
        price: product.price,
      });
    }

    const city = cities[Math.floor(Math.random() * cities.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 7));

    return {
      id: `#${(1000 + index).toString()}`,
      customerName: customer.name,
      email: customer.email,
      phone: customer.phone,
      items,
      total: `$${totalAmount.toFixed(2)}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      date: date.toISOString().split('T')[0],
      shippingAddress: {
        street: `${Math.floor(Math.random() * 999) + 1} ${['Main St', 'Park Ave', 'Oak St', 'Pine Rd'][Math.floor(Math.random() * 4)]}`,
        city,
        state: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal'][Math.floor(Math.random() * 5)],
        zipCode: `${Math.floor(Math.random() * 900000) + 100000}`,
        country: 'India',
      },
      trackingNumber: Math.random() > 0.5 ? `TRK${Math.floor(Math.random() * 1000000000)}` : undefined,
      carrier: Math.random() > 0.5 ? 'frenchexpress' : 'delhivery',
    };
  });
};

// Simulate API calls
let mockOrders = generateMockOrders();

export const orderService = {
  // Fetch all orders (simulates Shopify API)
  fetchOrders: async (): Promise<Order[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockOrders;
  },

  // Fetch orders by status
  fetchOrdersByStatus: async (status: Order['status']): Promise<Order[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockOrders.filter(order => order.status === status);
  },

  // Update order status
  updateOrderStatus: async (orderId: string, status: Order['status']): Promise<Order> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const orderIndex = mockOrders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
      mockOrders[orderIndex].status = status;
      return mockOrders[orderIndex];
    }
    throw new Error('Order not found');
  },

  // Simulate new orders coming in (like webhook)
  getNewOrders: async (): Promise<Order[]> => {
    // Randomly add new orders to simulate real-time updates
    if (Math.random() > 0.7) {
      const newOrder = generateMockOrders().slice(0, 1)[0];
      newOrder.id = `#${Date.now()}`;
      newOrder.status = 'new';
      newOrder.date = new Date().toISOString().split('T')[0];
      mockOrders.unshift(newOrder);
      return [newOrder];
    }
    return [];
  },

  // Search orders
  searchOrders: async (query: string): Promise<Order[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const lowercaseQuery = query.toLowerCase();
    return mockOrders.filter(order => 
      order.id.toLowerCase().includes(lowercaseQuery) ||
      order.customerName.toLowerCase().includes(lowercaseQuery) ||
      order.email.toLowerCase().includes(lowercaseQuery) ||
      order.items.some(item => 
        item.name.toLowerCase().includes(lowercaseQuery) ||
        item.sku.toLowerCase().includes(lowercaseQuery)
      )
    );
  },
};
