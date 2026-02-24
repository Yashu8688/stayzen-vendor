import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:line_icons/line_icons.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import 'main.dart'; // Import main to access AppColors

class NotificationsInboxPage extends StatefulWidget {
  const NotificationsInboxPage({super.key});

  @override
  State<NotificationsInboxPage> createState() => _NotificationsInboxPageState();
}

class _NotificationsInboxPageState extends State<NotificationsInboxPage> {
  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (user == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        title: Text('Notifications', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(LineIcons.angleLeft, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          TextButton(
            onPressed: () async {
              final batch = FirebaseFirestore.instance.batch();
              final notifications = await FirebaseFirestore.instance
                  .collection('notifications')
                  .where('targetId', isEqualTo: user.uid)
                  .where('status', isEqualTo: 'unread')
                  .get();
              
              for (var doc in notifications.docs) {
                batch.update(doc.reference, {'status': 'read', 'isRead': true});
              }
              await batch.commit();
              if (mounted) {
                 ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('All notifications marked as read')));
              }
            },
            child: const Text('Mark all read', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('notifications')
            .where('targetId', isEqualTo: user.uid)
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(30),
                    decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.05), shape: BoxShape.circle),
                    child: Icon(LineIcons.bellSlash, size: 80, color: AppColors.primary.withOpacity(0.3)),
                  ),
                  const SizedBox(height: 24),
                  Text('All caught up!', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
                  const SizedBox(height: 8),
                  Text('No new notifications found', style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                ],
              ),
            );
          }

          final docs = snapshot.data!.docs;
          // Sort manually since sub-collection indexing might not be set up
          docs.sort((a, b) {
            final aTime = (a.data() as Map)['createdAt'] ?? '';
            final bTime = (b.data() as Map)['createdAt'] ?? '';
            return bTime.toString().compareTo(aTime.toString());
          });

          return ListView.builder(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
            itemCount: docs.length,
            itemBuilder: (context, index) {
              final doc = docs[index];
              final data = doc.data() as Map<String, dynamic>;
              return _buildNotificationCard(doc.id, data, isDark);
            },
          );
        },
      ),
    );
  }

  Widget _buildNotificationCard(String docId, Map<String, dynamic> data, bool isDark) {
    final status = data['status'] ?? 'unread';
    final isUnread = status == 'unread';
    final type = data['type'] ?? 'INFO';
    final title = data['title'] ?? 'Notification';
    final message = data['message'] ?? '';
    final createdAtStr = data['createdAt'] ?? '';
    
    DateTime createdAt;
    try {
      createdAt = DateTime.tryParse(createdAtStr) ?? DateTime.now();
    } catch (_) {
      createdAt = DateTime.now();
    }

    IconData icon;
    Color iconColor;
    
    switch (type) {
      case 'NEW_BOOKING':
        icon = LineIcons.calendarCheck;
        iconColor = Colors.blue;
        break;
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_RECEIVED':
        icon = LineIcons.receipt;
        iconColor = Colors.green;
        break;
      case 'ALERT':
        icon = LineIcons.exclamationTriangle;
        iconColor = Colors.orange;
        break;
      case 'MESSAGE':
        icon = LineIcons.comments;
        iconColor = Colors.purple;
        break;
      default:
        icon = LineIcons.bell;
        iconColor = AppColors.primary;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 15),
      decoration: BoxDecoration(
        color: isUnread ? (isDark ? AppColors.primary.withOpacity(0.1) : AppColors.primary.withOpacity(0.03)) : (isDark ? AppColors.bgCardDark : Colors.white),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isUnread ? AppColors.primary.withOpacity(0.3) : (isDark ? AppColors.borderDark : AppColors.borderLight)),
        boxShadow: isUnread ? [] : [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => _showNotificationDetail(docId, data, isDark),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(color: iconColor.withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
                    child: Icon(icon, color: iconColor, size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: Text(
                                title, 
                                style: GoogleFonts.outfit(
                                  fontWeight: isUnread ? FontWeight.bold : FontWeight.w600, 
                                  fontSize: 15,
                                  color: isDark ? AppColors.textMainDark : AppColors.textMainLight
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              _getTimeAgo(createdAt),
                              style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          message,
                          style: TextStyle(
                            fontSize: 13, 
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            height: 1.4
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (isUnread) ...[
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                              ),
                              const SizedBox(width: 6),
                              const Text('New', style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          )
                        ]
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showNotificationDetail(String docId, Map<String, dynamic> data, bool isDark) {
    if (data['status'] == 'unread') {
      FirebaseFirestore.instance.collection('notifications').doc(docId).update({'status': 'read', 'isRead': true});
    }

    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), shape: BoxShape.circle),
                child: const Icon(LineIcons.bell, color: AppColors.primary, size: 30),
              ),
              const SizedBox(height: 20),
              Text(
                data['title'] ?? 'Notification',
                style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                data['createdAt'] != null ? DateFormat('dd MMM yyyy, hh:mm a').format(DateTime.parse(data['createdAt'])) : '',
                style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.bgCardDark : AppColors.bgCardLight,
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Text(
                  data['message'] ?? '',
                  style: TextStyle(
                    fontSize: 14, 
                    height: 1.6, 
                    color: isDark ? AppColors.textMainDark : AppColors.textMainLight
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 30),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                  ),
                  child: const Text('Close', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  String _getTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 7) {
      return DateFormat('dd MMM').format(dateTime);
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}
