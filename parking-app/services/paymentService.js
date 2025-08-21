import { Alert, Linking, Platform } from 'react-native';

class PaymentService {
  constructor() {
    this.supportedMethods = {
      'Google Pay': {
        icon: 'logo-google',
        color: '#4285F4',
        available: Platform.OS === 'android',
        deepLink: 'googlepay://',
        webUrl: 'https://pay.google.com',
      },
      'Apple Pay': {
        icon: 'logo-apple', 
        color: '#000000',
        available: Platform.OS === 'ios',
        deepLink: 'shoebox://',
        webUrl: 'https://wallet.apple.com',
      },
      'PayPal': {
        icon: 'card',
        color: '#0070BA',
        available: true,
        deepLink: 'paypal://',
        webUrl: 'https://www.paypal.com',
      },
      'Credit Card': {
        icon: 'card-outline',
        color: '#6B46C1',
        available: true,
        deepLink: null,
        webUrl: null,
      },
      'Bank Transfer': {
        icon: 'business-outline',
        color: '#3B82F6',
        available: true,
        deepLink: null,
        webUrl: null,
      },
    };
  }

  getAvailablePaymentMethods() {
    return Object.entries(this.supportedMethods)
      .filter(([_, method]) => method.available)
      .map(([name, method]) => ({
        name,
        ...method,
      }));
  }

  async processPayment(paymentMethod, amount, reservationData) {
    console.log('💳 Processing payment:', { paymentMethod, amount, reservationData });

    try {
      let paymentResult;
      
      switch (paymentMethod) {
        case 'Google Pay':
          paymentResult = await this.processGooglePay(amount, reservationData);
          break;
        case 'Apple Pay':
          paymentResult = await this.processApplePay(amount, reservationData);
          break;
        case 'PayPal':
          paymentResult = await this.processPayPal(amount, reservationData);
          break;
        case 'Credit Card':
          paymentResult = await this.processCreditCard(amount, reservationData);
          break;
        case 'Bank Transfer':
          paymentResult = await this.processBankTransfer(amount, reservationData);
          break;
        default:
          throw new Error('Unsupported payment method');
      }

      if (paymentResult.success && reservationData.reservationId) {
        const ParkingAPI = require('./api').default;
        
        await ParkingAPI.processPayment({
          reservationId: reservationData.reservationId,
          paymentMethod: paymentMethod,
          transactionId: paymentResult.transactionId,
          amount: amount
        });
      }

      return paymentResult;
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      throw error;
    }
  }

  async processGooglePay(amount, reservationData) {
    return new Promise((resolve, reject) => {
      Alert.alert(
        'Google Pay',
        `Processing payment of RON${amount} for parking reservation`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => reject(new Error('Payment cancelled by user')),
          },
          {
            text: 'Pay with Google Pay',
            onPress: async () => {
              try {
                // Try to open Google Pay app
                const canOpen = await Linking.canOpenURL('googlepay://');
                if (canOpen) {
                  await Linking.openURL('googlepay://');
                } else {
                  // Fallback to web
                  await Linking.openURL('https://pay.google.com');
                }
                
                // Simulate payment processing
                setTimeout(() => {
                  resolve({
                    success: true,
                    transactionId: `GP_${Date.now()}`,
                    method: 'Google Pay',
                    amount,
                    timestamp: new Date().toISOString(),
                  });
                }, 3000);
              } catch (error) {
                reject(error);
              }
            },
          },
        ]
      );
    });
  }

  async processApplePay(amount, reservationData) {
    return new Promise((resolve, reject) => {
      Alert.alert(
        'Apple Pay',
        `Processing payment of RON${amount} for parking reservation`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => reject(new Error('Payment cancelled by user')),
          },
          {
            text: 'Pay with Apple Pay',
            onPress: async () => {
              try {
                setTimeout(() => {
                  resolve({
                    success: true,
                    transactionId: `AP_${Date.now()}`,
                    method: 'Apple Pay',
                    amount,
                    timestamp: new Date().toISOString(),
                  });
                }, 3000);
              } catch (error) {
                reject(error);
              }
            },
          },
        ]
      );
    });
  }

  async processPayPal(amount, reservationData) {
    return new Promise((resolve, reject) => {
      Alert.alert(
        'PayPal',
        `You will be redirected to PayPal to complete the payment of RON${amount}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => reject(new Error('Payment cancelled by user')),
          },
          {
            text: 'Continue to PayPal',
            onPress: async () => {
              try {
                const canOpen = await Linking.canOpenURL('paypal://');
                if (canOpen) {
                  await Linking.openURL('paypal://');
                } else {
                  await Linking.openURL('https://www.paypal.com');
                }
                
                setTimeout(() => {
                  resolve({
                    success: true,
                    transactionId: `PP_${Date.now()}`,
                    method: 'PayPal',
                    amount,
                    timestamp: new Date().toISOString(),
                  });
                }, 4000);
              } catch (error) {
                reject(error);
              }
            },
          },
        ]
      );
    });
  }

  async processCreditCard(amount, reservationData) {
    return new Promise((resolve, reject) => {
      Alert.alert(
        'Credit Card Payment',
        `Enter your credit card details to pay RON${amount}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => reject(new Error('Payment cancelled by user')),
          },
          {
            text: 'Enter Card Details',
            onPress: () => {
              setTimeout(() => {
                resolve({
                  success: true,
                  transactionId: `CC_${Date.now()}`,
                  method: 'Credit Card',
                  amount,
                  timestamp: new Date().toISOString(),
                  last4: '****1234', 
                });
              }, 3000);
            },
          },
        ]
      );
    });
  }

  async processBankTransfer(amount, reservationData) {
    return new Promise((resolve, reject) => {
      Alert.alert(
        'Bank Transfer',
        `Bank Transfer Details:\n\nAmount: RON${amount}\nAccount: RO49 AAAA 1B31 0075 9384 0000\nReference: PARK_${reservationData.reservationId || 'NEW'}\n\nPlease complete the transfer and it will be verified within 1-2 business days.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => reject(new Error('Payment cancelled by user')),
          },
          {
            text: 'I\'ve Made the Transfer',
            onPress: () => {
              resolve({
                success: true,
                transactionId: `BT_${Date.now()}`,
                method: 'Bank Transfer',
                amount,
                timestamp: new Date().toISOString(),
                status: 'pending_verification',
              });
            },
          },
        ]
      );
    });
  }

  async verifyPayment(transactionId) {
    // Simulate payment verification
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          verified: true,
          transactionId,
          status: 'completed',
          verifiedAt: new Date().toISOString(),
        });
      }, 1000);
    });
  }

  formatAmount(amount) {
    return `RON${parseFloat(amount).toFixed(2)}`;
  }

  // Integration helpers for real payment services
  
  async initializeStripe() {
    console.log('🔧 Stripe initialization would happen here');
  }

  async initializeSquare() {
    console.log('🔧 Square initialization would happen here');
  }

  async initializePayPalSDK() {
    console.log('🔧 PayPal SDK initialization would happen here');
  }
}

const paymentService = new PaymentService();
export default paymentService;