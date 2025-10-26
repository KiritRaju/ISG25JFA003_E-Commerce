import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Address, AddressService } from '../../../core/services/address.service';
import { PaymentMethod, PaymentMethodService } from '../../../core/services/payment-method.service';
import { OrderService } from '../../../core/services/order.service';
import { CartService } from '../../../core/services/cart.service';
import { Router } from '@angular/router';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { MatDialogRef } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-checkout-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent, ErrorMessageComponent],
  templateUrl: './checkout-dialog.html',
  styleUrls: ['./checkout-dialog.scss']
})
export class CheckoutDialogComponent implements OnInit {
  addresses = signal<Address[]>([]);
  paymentMethods = signal<PaymentMethod[]>([]);
  selectedAddressId = signal<number | null>(null);
  selectedPaymentMethodId = signal<number | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  hasAddresses = computed(() => this.addresses().length > 0);
  hasPaymentMethods = computed(() => this.paymentMethods().length > 0);
  canPlaceOrder = computed(() => 
    this.selectedAddressId() !== null && this.selectedPaymentMethodId() !== null
  );

  private addressService = inject(AddressService);
  private paymentMethodService = inject(PaymentMethodService);
  private orderService = inject(OrderService);
  private cartService = inject(CartService);
  private router = inject(Router);
  private dialogRef = inject(MatDialogRef<CheckoutDialogComponent>);
  private authService = inject(AuthService);

  get addressId(): number | null {
    return this.selectedAddressId();
  }

  set addressId(value: number | null) {
    this.selectedAddressId.set(value);
  }

  get paymentMethodId(): number | null {
    return this.selectedPaymentMethodId();
  }

  set paymentMethodId(value: number | null) {
    this.selectedPaymentMethodId.set(value);
  }

  ngOnInit(): void {
    this.loadCheckoutData();
  }

  loadCheckoutData(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.selectedAddressId.set(null);
    this.selectedPaymentMethodId.set(null);
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.error.set('User not logged in.');
      this.isLoading.set(false);
      return;
    }

    forkJoin([
      this.addressService.getAddressesByUserId(userId),
      this.paymentMethodService.getPaymentMethodsByUserId(userId)
    ]).subscribe({
      next: ([addresses, paymentMethods]) => {
        this.addresses.set(addresses);
        if (addresses.length > 0) {
          this.selectedAddressId.set(addresses[0].id);
        } else {
          this.error.set('No addresses found. Please add one in your profile.');
        }

        this.paymentMethods.set(paymentMethods);
        if (paymentMethods.length > 0) {
          this.selectedPaymentMethodId.set(paymentMethods[0].paymentMethodId);
        } else {
          if (!this.error()) {
            this.error.set('No payment methods found. Please add one in your profile.');
          }
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading checkout data:', err);
        this.error.set('Failed to load checkout options. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  placeOrder(): void {
    const addressId = Number(this.selectedAddressId());
    const paymentMethodId = Number(this.selectedPaymentMethodId());

    if (isNaN(addressId) || isNaN(paymentMethodId) || addressId === null || paymentMethodId === null) {
      this.error.set('Please select both an address and a payment method.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.orderService.createOrder(addressId, paymentMethodId).subscribe({
      next: (order) => {
        this.cartService.clearCart().subscribe({
          next: () => {
            this.isLoading.set(false);
            this.dialogRef.close('orderPlaced');
          },
          error: (err) => {
            console.error('Error clearing cart after order:', err);
            this.isLoading.set(false);
            this.dialogRef.close('orderPlaced');
          }
        });
      },
      error: (err) => {
        console.error('Error placing order:', err);
        this.error.set('Failed to place order. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}