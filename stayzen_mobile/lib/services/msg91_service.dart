import 'dart:convert';
import 'package:http/http.dart' as http;

class Msg91Service {
  static const String _authKey = "478809AuxvhiDf692434a5P1";
  static const String _templateId = "6921a3d5c37f1e344d2a2799";

  static Future<bool> sendOtp(String phoneNumber) async {
    try {
      final cleanPhone = phoneNumber.replaceAll(RegExp(r'\D'), '');
      // Ensure it has 91 prefix if not present, and is 12 digits
      String finalPhone = cleanPhone;
      if (finalPhone.length == 10) {
        finalPhone = "91$finalPhone";
      }

      final url = Uri.parse(
          "https://control.msg91.com/api/v5/otp?template_id=$_templateId&mobile=$finalPhone&authkey=$_authKey&otp_length=6");

      final response = await http.get(url);
      final data = jsonDecode(response.body);

      if (data['type'] == 'success') return true;
      throw Exception(data['message'] ?? 'Failed to send OTP');
    } catch (e) {
      rethrow;
    }
  }

  static Future<bool> verifyOtp(String phoneNumber, String otp) async {
    try {
      final cleanPhone = phoneNumber.replaceAll(RegExp(r'\D'), '');
      String finalPhone = cleanPhone;
      if (finalPhone.length == 10) {
        finalPhone = "91$finalPhone";
      }

      final url = Uri.parse(
          "https://control.msg91.com/api/v5/otp/verify?otp=$otp&mobile=$finalPhone&authkey=$_authKey");

      final response = await http.get(url);
      final data = jsonDecode(response.body);

      if (data['type'] == 'success') return true;
      throw Exception(data['message'] ?? 'Invalid OTP');
    } catch (e) {
      rethrow;
    }
  }
}
