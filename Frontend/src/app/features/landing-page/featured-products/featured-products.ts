import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProductResponseDTO } from '../../../core/models/product';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-featured-products',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule],
  templateUrl: './featured-products.html'
})
export class FeaturedProductsComponent implements OnInit {
  products = signal<ProductResponseDTO[]>([]);
  isLoading = signal<boolean>(true);

  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.products.set(data
          .filter(p => p.is_active)
          .slice(0, 4));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load products:', err);
        this.isLoading.set(false);
      }
    });
  }

  navigateToProduct(productId: number): void {
    this.router.navigate(['/products', productId]);
  }

  navigateToAllProducts(): void {
    this.router.navigate(['/products']);
  }

  addToCart(product: ProductResponseDTO, event: Event): void {
    event.stopPropagation(); // Prevent navigation to product details

    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.snackBar.open('Please login to add items to cart', 'Close', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['snackbar-warning']
      });
      this.router.navigate(['/login']);
      return;
    }

    // Check if product has stock
    if (product.quantity <= 0) {
      this.snackBar.open('Product is out of stock', 'Close', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['snackbar-error']
      });
      return;
    }

    // Add to cart
    this.cartService.addCartItem(product.id, 1).subscribe({
      next: () => {
        this.snackBar.open('Product added to cart successfully!', 'Close', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['snackbar-success']
        });
      },
      error: (err) => {
        console.error('Error adding to cart:', err);
        this.snackBar.open('Failed to add product to cart', 'Close', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['snackbar-error']
        });
      }
    });
  }
}