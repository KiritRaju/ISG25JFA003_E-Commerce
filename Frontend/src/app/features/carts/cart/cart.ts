import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';
import { CartResponse, CartItemResponse, CartItemRequest } from '../../../core/models/cart';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CheckoutDialogComponent } from '../checkout-dialog/checkout-dialog';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatSnackBarModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss']
})
export class CartComponent implements OnInit {
  // Using signals for reactive state management (Angular 20)
  cart = signal<CartResponse | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  
  // Computed signals (Angular 20)
  totalItems = computed(() => {
    const currentCart = this.cart();
    if (!currentCart || !currentCart.items) {
      return 0;
    }
    return currentCart.items.reduce((sum, item) => sum + item.quantity, 0);
  });

  // Inject dependencies using inject() function (Angular 20)
  private cartService = inject(CartService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.cartService.getCart().subscribe({
      next: (data) => {
        this.cart.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.cart.set(null);
        this.isLoading.set(false);
        this.error.set("Failed to load cart. Please try again.");
        console.error('Failed to load cart:', err);
      }
    });
  }

  removeItem(itemId: number, event: Event): void {
    event.stopPropagation();
    if (!confirm('Are you sure you want to remove this item?')) return;
    
    this.cartService.removeCartItem(itemId).subscribe({
      next: () => {
        const currentCart = this.cart();
        if (currentCart) {
          this.cart.update(cart => {
            if (!cart) return cart;
            return {
              ...cart,
              items: cart.items.filter(item => item.id !== itemId)
            };
          });
          this.recalculateCartTotal();
        }
      },
      error: (err) => {
        this.error.set('Failed to remove item.');
        console.error('Error removing item:', err);
      }
    });
  }

  updateQuantity(item: CartItemResponse, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const newQuantity = parseInt(inputElement.value, 10);

    if (isNaN(newQuantity) || newQuantity < 1) {
      this.snackBar.open('Quantity must be a positive number.', 'Dismiss', { duration: 3000 });
      inputElement.value = item.quantity.toString();
      return;
    }

    const itemRequest: CartItemRequest = { productId: item.productId, quantity: newQuantity };

    this.cartService.updateCartItem(item.id, itemRequest).subscribe({
      next: (updatedItem) => {
        this.cart.update(cart => {
          if (!cart) return cart;
          const index = cart.items.findIndex((i: CartItemResponse) => i.id === updatedItem.id);
          if (index !== -1) {
            const newItems = [...cart.items];
            newItems[index] = updatedItem;
            return { ...cart, items: newItems };
          }
          return cart;
        });
        this.recalculateCartTotal();
      },
      error: (err) => {
        this.snackBar.open('Failed to update quantity. The item may be out of stock.', 'Dismiss', { duration: 3000 });
        inputElement.value = item.quantity.toString();
      }
    });
  }
  
  clearCart(): void {
    const currentCart = this.cart();
    if (!currentCart || !confirm('Are you sure you want to empty your entire cart?')) return;
    
    this.cartService.clearCart().subscribe({
      next: () => {
        this.cart.update(cart => {
          if (!cart) return cart;
          return { ...cart, items: [], totalPrice: 0 };
        });
      },
      error: (err) => {
        this.error.set('Failed to clear the cart.');
        console.error('Error clearing cart:', err);
      }
    });
  }

  openCheckoutDialog(): void {
    const dialogRef = this.dialog.open(CheckoutDialogComponent, {
      width: '600px',
      height: 'auto',
      maxHeight: '90vh',
      disableClose: true,
      panelClass: 'checkout-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'orderPlaced') {
        this.router.navigate(['/orders']);
      }
    });
  }

  navigateToProduct(productId: number): void {
    this.router.navigate(['/products', productId]);
  }

  private recalculateCartTotal(): void {
    this.cart.update(cart => {
      if (!cart) return cart;
      const totalPrice = cart.items.reduce((total: number, item: CartItemResponse) => {
        return total + (Number(item.price) * Number(item.quantity));
      }, 0);
      return { ...cart, totalPrice };
    });
  }


  incrementQuantity(item: CartItemResponse, event: Event): void {
    event.stopPropagation();
    const newQuantity = item.quantity + 1;
    const itemRequest: CartItemRequest = { productId: item.productId, quantity: newQuantity };

    this.cartService.updateCartItem(item.id, itemRequest).subscribe({
      next: (updatedItem) => {
        this.cart.update(cart => {
          if (!cart) return cart;
          const index = cart.items.findIndex((i: CartItemResponse) => i.id === updatedItem.id);
          if (index !== -1) {
            const newItems = [...cart.items];
            newItems[index] = updatedItem;
            return { ...cart, items: newItems };
          }
          return cart;
        });
        this.recalculateCartTotal();
      },
      error: (err) => {
        this.snackBar.open('Failed to update quantity.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  decrementQuantity(item: CartItemResponse, event: Event): void {
    event.stopPropagation();
    if (item.quantity <= 1) return;
    
    const newQuantity = item.quantity - 1;
    const itemRequest: CartItemRequest = { productId: item.productId, quantity: newQuantity };

    this.cartService.updateCartItem(item.id, itemRequest).subscribe({
      next: (updatedItem) => {
        this.cart.update(cart => {
          if (!cart) return cart;
          const index = cart.items.findIndex((i: CartItemResponse) => i.id === updatedItem.id);
          if (index !== -1) {
            const newItems = [...cart.items];
            newItems[index] = updatedItem;
            return { ...cart, items: newItems };
          }
          return cart;
        });
        this.recalculateCartTotal();
      },
      error: (err) => {
        this.snackBar.open('Failed to update quantity.', 'Dismiss', { duration: 3000 });
      }
    });
  }
}