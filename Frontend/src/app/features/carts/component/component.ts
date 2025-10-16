import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';
import { CartResponse, CartItemResponse, CartItemRequest } from '../../../core/models/cart';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './component.html'
})
export class CartComponent implements OnInit {
  cart: CartResponse | null = null;
  isLoading = true;
  error: string | null = null;
  
  constructor(private cartService: CartService) { }

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.isLoading = true;
    this.error = null;
    this.cartService.getCart().subscribe({
      next: (data) => {
        console.log('Cart data received:', data); // Debug log
        this.cart = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.cart = null; 
        this.isLoading = false;
        this.error = "Failed to load cart. Please try again.";
        console.error('Failed to load cart:', err);
        // Detailed error logging
        if (err.error instanceof ErrorEvent) {
          // Client-side error
          console.error('Client error:', err.error.message);
        } else {
          // Server-side error
          console.error('Server error:', {
            status: err.status,
            message: err.message,
            error: err.error
          });
        }
      }
    });
  }

  removeItem(itemId: number): void {
    if (!confirm('Are you sure you want to remove this item?')) return;
    
    this.cartService.removeCartItem(itemId).subscribe({
      next: () => {
        if (this.cart) {
          // Remove item locally
          this.cart.items = this.cart.items.filter(item => item.id !== itemId);
          this.recalculateCartTotal();
        }
      },
      error: (err) => { 
        this.error = 'Failed to remove item.'; 
        console.error('Error removing item:', err);
      }
    });
  }

  updateQuantity(item: CartItemResponse, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const newQuantity = parseInt(inputElement.value, 10);

    if (isNaN(newQuantity) || newQuantity < 1) {
      alert('Quantity must be a positive number.');
      inputElement.value = item.quantity.toString();
      return;
    }

    const itemRequest: CartItemRequest = { productId: item.productId, quantity: newQuantity };

    this.cartService.updateCartItem(item.id, itemRequest).subscribe({
      next: (updatedItem) => {
        // Update local data instead of reloading
        if (this.cart) {
          const index = this.cart.items.findIndex(i => i.id === updatedItem.id);
          if (index !== -1) {
            this.cart.items[index] = updatedItem;
            this.recalculateCartTotal();
          }
        }
      },
      error: (err) => {
        alert('Failed to update quantity. The item may be out of stock.');
        inputElement.value = item.quantity.toString(); // Reset the input value
      }
    });
  }
  
  clearCart(): void {
    if (!this.cart || !confirm('Are you sure you want to empty your entire cart?')) return;
    
    this.cartService.clearCart().subscribe({
      next: () => {
        // Update local state
        if (this.cart) {
          this.cart.items = [];
          this.cart.totalPrice = 0;
        }
      },
      error: (err) => { 
        this.error = 'Failed to clear the cart.'; 
        console.error('Error clearing cart:', err);
      }
    });
  }

  private recalculateCartTotal(): void {
    if (this.cart) {
      this.cart.totalPrice = this.cart.items.reduce((total, item) => {
        return total + (Number(item.price) * Number(item.quantity));
      }, 0);
    }
  }

  get totalItems(): number {
    if (!this.cart || !this.cart.items) {
      return 0;
    }
    return this.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}