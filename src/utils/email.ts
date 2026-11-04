import nodemailer from 'nodemailer';
import { env } from '../config/env';
import {EmailOptions} from "../types/email";



const createTransporter = () => {
    return nodemailer.createTransport({
        host: env.email.host,
        port: env.email.port,
        // secure: fasle,
        auth: {
            user: env.email.user,
            pass: env.email.password,
        },
    });
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `${env.email.from} <${env.email.user}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${options.to}`);
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw new Error('Email could not be sent');
    }
};

export const sendPasswordResetEmail = async (
    email: string,
    resetToken: string
): Promise<void> => {
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

    const message = `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
    `;

    await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        html: message,
        text: `You requested a password reset. Visit this URL to reset your password: ${resetUrl}. This link expires in 10 minutes.`,
    });
};

export const sendVerificationEmail = async (
    email: string,
    verificationToken: string
): Promise<void> => {
    const verificationUrl = `http://localhost:3000/verify-email/${verificationToken}`;

    const message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to Our E-Commerce Store!</h1>
            <p>Thank you for registering. Please verify your email address to activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="display: inline-block; 
                          padding: 15px 30px; 
                          background-color: #667eea; 
                          color: white; 
                          text-decoration: none; 
                          border-radius: 5px;
                          font-weight: bold;">
                    Verify Email Address
                </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">
                <a href="${verificationUrl}">${verificationUrl}</a>
            </p>
            <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
            <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: 'Verify Your Email Address',
        html: message,
        text: `Welcome! Please verify your email address by visiting: ${verificationUrl}. This link expires in 24 hours.`,
    });
};

export const sendOrderConfirmationEmail = async (
    email: string,
    orderDetails: {
        orderId: string;
        orderNumber?: string;
        customerName: string;
        items: Array<{ name: string; quantity: number; price: number }>;
        totalPrice: number;
        shippingAddress: string;
        createdAt: Date;
    }
): Promise<void> => {
    const itemsHtml = orderDetails.items
        .map(
            (item) => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
    `
        )
        .join('');

    const message = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; }
                .order-info { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .order-table th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: bold; }
                .total { font-size: 18px; font-weight: bold; color: #667eea; text-align: right; margin-top: 20px; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Order Confirmed!</h1>
                    <p>Thank you for your order, ${orderDetails.customerName}!</p>
                </div>
                
                <div class="content">
                    <div class="order-info">
                        <h2>Order Details</h2>
                        <p><strong>Order ID:</strong> #${orderDetails.orderNumber || orderDetails.orderId.slice(-8).toUpperCase()}</p>
                        <p><strong>Order Date:</strong> ${new Date(orderDetails.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</p>
                        <p><strong>Status:</strong> <span style="color: #f59e0b;">Pending Payment</span></p>
                    </div>

                    <div class="order-info">
                        <h3>Items Ordered</h3>
                        <table class="order-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th style="text-align: center;">Quantity</th>
                                    <th style="text-align: right;">Price</th>
                                    <th style="text-align: right;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                        <div class="total">
                            Total: $${orderDetails.totalPrice.toFixed(2)}
                        </div>
                    </div>

                    <div class="order-info">
                        <h3>Shipping Address</h3>
                        <p>${orderDetails.shippingAddress}</p>
                    </div>

                    <div style="text-align: center;">
                        <a href="${env.frontendUrl}/orders/${orderDetails.orderId}" class="button">View Order Details</a>
                    </div>

                    <p style="margin-top: 30px; color: #666;">
                        <strong>What's next?</strong><br>
                        Complete your payment to start processing your order. You'll receive another email once your payment is confirmed.
                    </p>
                </div>

                <div class="footer">
                    <p>Questions? Contact us at support@ecommerce.com</p>
                    <p>&copy; ${new Date().getFullYear()} E-Commerce Store. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    await sendEmail({
        to: email,
        subject: `Order Confirmation - #${orderDetails.orderNumber || orderDetails.orderId.slice(-8).toUpperCase()}`,
        html: message,
    });
};

export const sendPaymentSuccessEmail = async (
    email: string,
    paymentDetails: {
        orderId: string;
        orderNumber?: string;
        customerName: string;
        amount: number;
        paymentMethod: string;
        transactionId: string;
        paidAt: Date;
    }
): Promise<void> => {
    const message = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; }
                .payment-info { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .success-icon { font-size: 64px; margin-bottom: 20px; }
                .amount { font-size: 32px; font-weight: bold; color: #10b981; margin: 20px 0; }
                .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="success-icon">✅</div>
                    <h1>Payment Successful!</h1>
                    <p>Your payment has been received</p>
                </div>
                
                <div class="content">
                    <div class="payment-info">
                        <h2>Payment Receipt</h2>
                        <div class="amount">$${paymentDetails.amount.toFixed(2)}</div>
                        
                        <div class="info-row">
                            <span><strong>Order ID:</strong></span>
                            <span>#${paymentDetails.orderNumber || paymentDetails.orderId.slice(-8).toUpperCase()}</span>
                        </div>
                        
                        <div class="info-row">
                            <span><strong>Transaction ID:</strong></span>
                            <span>${paymentDetails.transactionId}</span>
                        </div>
                        
                        <div class="info-row">
                            <span><strong>Payment Method:</strong></span>
                            <span>${paymentDetails.paymentMethod === 'card' ? 'Credit/Debit Card' : paymentDetails.paymentMethod}</span>
                        </div>
                        
                        <div class="info-row" style="border: none;">
                            <span><strong>Payment Date:</strong></span>
                            <span>${new Date(paymentDetails.paidAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}</span>
                        </div>
                    </div>

                    <div style="text-align: center;">
                        <a href="${env.frontendUrl}/orders/${paymentDetails.orderId}" class="button">View Order Status</a>
                    </div>

                    <div class="payment-info">
                        <h3>What's Next?</h3>
                        <p>✅ Your order is now being processed</p>
                        <p>📦 You'll receive a shipping confirmation once your order is dispatched</p>
                        <p>📧 Track your order status anytime from your account</p>
                    </div>
                </div>

                <div class="footer">
                    <p>Questions about your payment? Contact us at support@ecommerce.com</p>
                    <p>&copy; ${new Date().getFullYear()} E-Commerce Store. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    await sendEmail({
        to: email,
        subject: `Payment Received - Order #${paymentDetails.orderNumber || paymentDetails.orderId.slice(-8).toUpperCase()}`,
        html: message,
    });
};

export const sendOrderStatusEmail = async (
    email: string,
    orderDetails: {
        orderId: string;
        orderNumber?: string;
        customerName: string;
        status: string;
        trackingNumber?: string;
        updatedAt: Date;
    }
): Promise<void> => {
    const statusMessages: Record<string, { title: string; message: string; color: string; icon: string }> = {
        processing: {
            title: 'Order is Being Processed',
            message: 'We\'re preparing your order for shipment.',
            color: '#f59e0b',
            icon: '⏳',
        },
        shipped: {
            title: 'Order Shipped!',
            message: 'Your order is on its way!',
            color: '#3b82f6',
            icon: '🚚',
        },
        delivered: {
            title: 'Order Delivered',
            message: 'Your order has been successfully delivered.',
            color: '#10b981',
            icon: '📦',
        },
        cancelled: {
            title: 'Order Cancelled',
            message: 'Your order has been cancelled.',
            color: '#ef4444',
            icon: '❌',
        },
    };

    const statusInfo = statusMessages[orderDetails.status] || statusMessages.processing;

    const message = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: ${statusInfo.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .icon { font-size: 64px; margin-bottom: 10px; }
                .content { background: #f9fafb; padding: 30px; }
                .status-info { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .button { display: inline-block; padding: 12px 30px; background: ${statusInfo.color}; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .tracking { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
                .tracking-number { font-size: 20px; font-weight: bold; color: #d97706; margin-top: 10px; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icon">${statusInfo.icon}</div>
                    <h1>${statusInfo.title}</h1>
                    <p>${statusInfo.message}</p>
                </div>
                
                <div class="content">
                    <div class="status-info">
                        <p>Hi ${orderDetails.customerName},</p>
                        <p><strong>Order ID:</strong> #${orderDetails.orderNumber || orderDetails.orderId.slice(-8).toUpperCase()}</p>
                        <p><strong>Status:</strong> <span style="color: ${statusInfo.color}; font-weight: bold;">${orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}</span></p>
                        <p><strong>Updated:</strong> ${new Date(orderDetails.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}</p>
                    </div>

                    ${orderDetails.trackingNumber ? `
                        <div class="tracking">
                            <p><strong>📍 Tracking Number</strong></p>
                            <div class="tracking-number">${orderDetails.trackingNumber}</div>
                            <p style="margin-top: 10px; font-size: 14px;">Use this number to track your shipment</p>
                        </div>
                    ` : ''}

                    <div style="text-align: center;">
                        <a href="${env.frontendUrl}/orders/${orderDetails.orderId}" class="button">Track Your Order</a>
                    </div>
                </div>

                <div class="footer">
                    <p>Need help? Contact us at support@ecommerce.com</p>
                    <p>&copy; ${new Date().getFullYear()} E-Commerce Store. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    await sendEmail({
        to: email,
        subject: `Order ${statusInfo.title} - #${orderDetails.orderNumber || orderDetails.orderId.slice(-8).toUpperCase()}`,
        html: message,
    });
};

export const sendPaymentFailedEmail = async (
    email: string,
    paymentDetails: {
        orderId: string;
        orderNumber?: string;
        customerName: string;
        amount: number;
        reason: string;
    }
): Promise<void> => {
    const message = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; }
                .info { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div style="font-size: 64px; margin-bottom: 10px;">⚠️</div>
                    <h1>Payment Failed</h1>
                    <p>We couldn't process your payment</p>
                </div>
                
                <div class="content">
                    <div class="info">
                        <p>Hi ${paymentDetails.customerName},</p>
                        <p>Unfortunately, we were unable to process your payment for order <strong>#${paymentDetails.orderNumber || paymentDetails.orderId.slice(-8).toUpperCase()}</strong>.</p>
                        
                        <p><strong>Amount:</strong> $${paymentDetails.amount.toFixed(2)}</p>
                        <p><strong>Reason:</strong> ${paymentDetails.reason}</p>
                        
                        <p style="margin-top: 20px;">Don't worry! You can try again using a different payment method or contact your bank for more information.</p>
                    </div>

                    <div style="text-align: center;">
                        <a href="${env.frontendUrl}/orders/${paymentDetails.orderId}" class="button">Retry Payment</a>
                    </div>
                </div>

                <div class="footer">
                    <p>Need assistance? Contact us at support@ecommerce.com</p>
                    <p>&copy; ${new Date().getFullYear()} E-Commerce Store. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    await sendEmail({
        to: email,
        subject: `Payment Failed - Order #${paymentDetails.orderNumber || paymentDetails.orderId.slice(-8).toUpperCase()}`,
        html: message,
    });
};