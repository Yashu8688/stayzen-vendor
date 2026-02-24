import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:line_icons/line_icons.dart';
import 'main.dart'; // Import for AppColors

class NotificationSettingsPage extends StatefulWidget {
  const NotificationSettingsPage({super.key});

  @override
  State<NotificationSettingsPage> createState() => _NotificationSettingsPageState();
}

class _NotificationSettingsPageState extends State<NotificationSettingsPage> {
  bool _pushEnabled = true;
  bool _emailEnabled = true;
  bool _smsEnabled = false;
  bool _isLoading = true;

  final User? user = FirebaseAuth.instance.currentUser;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    if (user == null) return;
    try {
      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(user!.uid)
          .collection('settings')
          .doc('notifications')
          .get();

      if (doc.exists) {
        setState(() {
          _pushEnabled = doc.data()?['pushEnabled'] ?? true;
          _emailEnabled = doc.data()?['emailEnabled'] ?? true;
          _smsEnabled = doc.data()?['smsEnabled'] ?? false;
        });
      }
    } catch (e) {
      debugPrint('Error loading settings: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _updateSetting(String key, bool value) async {
    if (user == null) return;
    
    // update local state immediately for UI responsiveness
    setState(() {
      if (key == 'pushEnabled') _pushEnabled = value;
      if (key == 'emailEnabled') _emailEnabled = value;
      if (key == 'smsEnabled') _smsEnabled = value;
    });

    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user!.uid)
          .collection('settings')
          .doc('notifications')
          .set({
        key: value,
        'updatedAt': DateTime.now().toIso8601String(),
      }, SetOptions(merge: true));
    } catch (e) {
      debugPrint('Error updating setting: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update setting: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('Notification Settings', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        centerTitle: true,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  _buildSettingItem(
                    title: 'Push Notifications',
                    subtitle: 'Receive alerts for booking updates',
                    value: _pushEnabled,
                    onChanged: (val) => _updateSetting('pushEnabled', val),
                  ),
                  _buildSettingItem(
                    title: 'Email Notifications',
                    subtitle: 'Daily updates and newsletters',
                    value: _emailEnabled,
                    onChanged: (val) => _updateSetting('emailEnabled', val),
                  ),
                  _buildSettingItem(
                    title: 'SMS Notifications',
                    subtitle: 'Receive SMS for urgent matters',
                    value: _smsEnabled,
                    onChanged: (val) => _updateSetting('smsEnabled', val),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSettingItem({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC), // AppColors.bgCardDark / Light
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE5E7EB), // AppColors.borderDark / Light
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          Transform.scale(
            scale: 0.9,
            child: Switch(
              value: value,
              onChanged: onChanged,
              activeColor: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }
}
