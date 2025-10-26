import { Component, HostListener, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CartService } from '../../../core/services/cart.service'; // Import CartService
import { CartResponse } from '../../../core/models/cart'; // Import CartResponse
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isScrolled = false;
  cartItemCount = 0; // New property
  isLoggedIn = false;
  isAdmin = false; // New property
  private cartService = inject(CartService); // Inject CartService
  private authService = inject(AuthService);
  private router = inject(Router);
  private cartCountSubscription?: Subscription;
  private authSubscription?: Subscription;

  ngOnInit(): void { // Implemented OnInit
    // Subscribe to cart count changes
    this.cartCountSubscription = this.cartService.cartCount$.subscribe(count => {
      this.cartItemCount = count;
    });

    this.authSubscription = this.authService.loggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
      const user = this.authService.getCurrentUser();
      this.isAdmin = !!(user && (user.role === 'ADMIN' || user.role === 'ROLE_ADMIN'));
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.cartCountSubscription) {
      this.cartCountSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
