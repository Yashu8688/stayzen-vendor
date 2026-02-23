import 'package:flutter/material.dart';

abstract class PaymentBridge {
  void init(Function(String?) onSuccess, Function(String?) onError);
  void openCheckout(Map<String, dynamic> options);
  void dispose();
}

PaymentBridge getPaymentBridge() => throw UnsupportedError('Cannot create bridge');
