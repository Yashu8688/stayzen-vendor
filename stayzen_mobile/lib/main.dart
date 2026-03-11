import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_nav_bar/google_nav_bar.dart';
import 'package:line_icons/line_icons.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import 'services/msg91_service.dart';
import 'payment_interface.dart';
import 'payment_factory.dart';
import 'notifications_page.dart';
import 'notification_settings_page.dart';


// --- COLORS ---
class AppColors {
  static const primary = Color(0xFF1AA79C);
  
  // Light Theme
  static const bgLight = Color(0xFFFFFFFF);
  static const bgCardLight = Color(0xFFF8FAFC);
  static const textMainLight = Color(0xFF111827);
  static const textMutedLight = Color(0xFF64748B);
  static const borderLight = Color(0xFFE5E7EB);

  // Dark Theme (The Blue Color)
  static const bgDark = Color(0xFF0F172A);
  static const bgCardDark = Color(0xFF1E293B);
  static const textMainDark = Color(0xFFF1F5F9);
  static const textMutedDark = Color(0xFF94A3B8);
  static const borderDark = Color(0xFF334155);

  // Missing constants used in code
  static const textMain = Color(0xFFF1F5F9);
  static const textMuted = Color(0xFF94A3B8);
  static const secondary = Color(0xFF1AA79C); // Using primary as secondary for now
}

// --- GLOBAL HELPERS ---
Widget commonBuildImage(String? source, {double? width, double? height, BoxFit fit = BoxFit.cover, double borderRadius = 0}) {
  Widget img;
  if (source == null || source.isEmpty) {
    img = Image.network('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', width: width, height: height, fit: fit);
  } else if (source.startsWith('data:image')) {
    try {
      final base64String = source.split(',').last;
      img = Image.memory(base64Decode(base64String), width: width, height: height, fit: fit);
    } catch (e) {
      img = Image.network('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', width: width, height: height, fit: fit);
    }
  } else {
    img = Image.network(
      source,
      width: width,
      height: height,
      fit: fit,
      cacheWidth: width != null ? (width * 2).toInt() : null, // Optimize memory
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return Container(
          width: width,
          height: height,
          color: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.black.withOpacity(0.05),
          child: const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
        );
      },
      errorBuilder: (context, error, stackTrace) => Image.network('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', width: width, height: height, fit: fit),
    );
  }

  if (borderRadius > 0) {
    return ClipRRect(borderRadius: BorderRadius.circular(borderRadius), child: img);
  }
  return img;
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: const FirebaseOptions(
      apiKey: "AIzaSyA2-Pnc7p8NvjEhIB0ZVh64DifRDeS0FSE",
      authDomain: "stayzen-dcc00.firebaseapp.com",
      projectId: "stayzen-dcc00",
      storageBucket: "stayzen-dcc00.firebasestorage.app",
      messagingSenderId: "538053550578",
      appId: "1:538053550578:web:b093963a84778e46804b6b",
    ),
  );
  runApp(
    ChangeNotifierProvider(
      create: (context) => AppState(),
      child: const StayZenApp(),
    ),
  );
}

class AppState extends ChangeNotifier {
  int _selectedIndex = 0;
  ThemeMode _themeMode = ThemeMode.system;

  int get selectedIndex => _selectedIndex;
  ThemeMode get themeMode => _themeMode;

  void setIndex(int index) {
    _selectedIndex = index;
    notifyListeners();
  }

  void setThemeMode(ThemeMode mode) {
    _themeMode = mode;
    notifyListeners();
  }
}

class StayZenApp extends StatelessWidget {
  const StayZenApp({super.key});

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    return MaterialApp(
      title: 'StayZen',
      debugShowCheckedModeBanner: false,
      themeMode: state.themeMode,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        scaffoldBackgroundColor: AppColors.bgLight,
        primaryColor: AppColors.primary,
        colorScheme: const ColorScheme.light(
          primary: AppColors.primary,
          surface: AppColors.bgCardLight,
          onSurface: AppColors.textMainLight,
        ),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.light().textTheme).copyWith(
          bodyLarge: const TextStyle(color: AppColors.textMainLight),
          bodyMedium: const TextStyle(color: AppColors.textMainLight),
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.bgDark,
        primaryColor: AppColors.primary,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.primary,
          surface: AppColors.bgCardDark,
          onSurface: AppColors.textMainDark,
        ),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme).copyWith(
          bodyLarge: const TextStyle(color: AppColors.textMainDark),
          bodyMedium: const TextStyle(color: AppColors.textMainDark),
        ),
      ),
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasData) {
          return const MainScreen();
        }
        return const LoginPage();
      },
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    _setupInAppNotifications();
  }
  
  void _setupInAppNotifications() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    
    // Track first load
    bool isFirstLoad = true;

    FirebaseFirestore.instance
        .collection('notifications')
        .where('targetId', isEqualTo: user.uid)
        .snapshots()
        .listen((snapshot) async {
       
       // 5 minute threshold for "Recent" items on startup
       final nowUtc = DateTime.now().toUtc();
       final threshold = nowUtc.subtract(const Duration(minutes: 5));

       for (var change in snapshot.docChanges) {
         if (change.type == DocumentChangeType.added) {
           final data = change.doc.data() as Map<String, dynamic>;

           // Logic: If First Load, ONLY show recent items. If Live, ALWAYS show.
           if (isFirstLoad) {
               bool isRecent = false;
               try {
                   final c = data['createdAt'];
                   if (c is String) {
                       final d = DateTime.tryParse(c);
                       if (d != null) {
                            // Convert to Use for comparison
                            if ((d.isUtc ? d : d.toUtc()).isAfter(threshold)) isRecent = true;
                       }
                   }
               } catch (e) {}
               
               if (!isRecent) continue; // Skip old items on startup
           }

           debugPrint('🔔 Notification Received: ${data['title']} - ${data['message']}');
           
           try {
             final settings = await FirebaseFirestore.instance.collection('users').doc(user.uid).collection('settings').doc('notifications').get();
             bool pushEnabled = true;
             if (settings.exists) {
                pushEnabled = settings.data()?['pushEnabled'] ?? true;
             }
             debugPrint('🔔 Push Enabled: $pushEnabled');
             
             if (pushEnabled && mounted) {
                debugPrint('🔔 Showing SnackBar Popup');
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    behavior: SnackBarBehavior.floating,
                    margin: const EdgeInsets.all(16),
                    backgroundColor: Colors.transparent,
                    elevation: 0,
                    duration: const Duration(seconds: 5),
                    content: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B), // Dark blue/slate
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.primary),
                        boxShadow: [
                           BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.2), shape: BoxShape.circle),
                            child: const Icon(LineIcons.bell, color: AppColors.primary, size: 24),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(data['title'] ?? 'Notification', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16)),
                                const SizedBox(height: 4),
                                Text(data['message'] ?? 'New update received', style: const TextStyle(color: Colors.white70, fontSize: 14)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
             }
           } catch(e) {
             debugPrint('Notification Error: $e');
           }
         }
       }
       isFirstLoad = false;
    });
  }


  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    final List<Widget> screens = [
      DashboardPage(onMenuTap: () => _scaffoldKey.currentState?.openDrawer()),
      const BookingsPage(),
      const FavoritesPage(),
      const ProfilePage(),
    ];

    return Scaffold(
      key: _scaffoldKey,
      drawer: const AppDrawer(),
      body: screens[state.selectedIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.bgCardDark : AppColors.bgLight,
          border: Border(top: BorderSide(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5))),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 15.0, vertical: 8),
        child: GNav(
          backgroundColor: isDark ? AppColors.bgCardDark : AppColors.bgLight,
          gap: 8,
          activeColor: AppColors.primary,
          iconSize: 24,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          duration: const Duration(milliseconds: 400),
          tabBackgroundColor: AppColors.primary.withOpacity(0.1),
          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
          tabs: const [
            GButton(icon: LineIcons.compass, text: 'Explore'),
            GButton(icon: LineIcons.calendar, text: 'Bookings'),
            GButton(icon: LineIcons.heart, text: 'Favorites'),
            GButton(icon: LineIcons.user, text: 'Profile'),
          ],
          selectedIndex: state.selectedIndex,
          onTabChange: (index) {
            state.setIndex(index);
          },
        ),
      ),
    );
  }
}

// --- DRAWER ---
class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Drawer(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 60, left: 24, right: 24, bottom: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Menu', style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w800, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
                    Text('Welcome to StayZen', style: GoogleFonts.outfit(fontSize: 13, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                  ],
                ),
                IconButton(
                  icon: const Icon(LineIcons.times, size: 24),
                  onPressed: () => Navigator.pop(context),
                )
              ],
            ),
          ),
          if (user != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Container(
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.bgCardDark : AppColors.bgCardLight,
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(25),
                        image: user.photoURL != null ? DecorationImage(image: NetworkImage(user.photoURL!), fit: BoxFit.cover) : null,
                      ),
                      child: user.photoURL == null ? const Icon(LineIcons.user, color: Colors.white) : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(user.displayName ?? 'StayZen User', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: isDark ? AppColors.textMainDark : AppColors.textMainLight), maxLines: 1),
                          Text(user.email ?? '', style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 12), maxLines: 1),
                        ],
                      ),
                    )
                  ],
                ),
              ),
            ),
          const SizedBox(height: 20),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              children: [
                _drawerItem(context, LineIcons.creditCard, 'Payments', const PaymentsPage()),
                _drawerItem(context, LineIcons.bell, 'Notifications', const NotificationsInboxPage()),
                _drawerItem(context, Icons.help_outline, 'Help Center', const HelpCenterPage()),
                _drawerItem(context, LineIcons.comments, 'Feedback', const FeedbackPage()),
                Divider(color: isDark ? AppColors.borderDark : AppColors.borderLight, height: 40),
                ListTile(
                  leading: const Icon(LineIcons.alternateSignOut, color: Colors.redAccent),
                  title: const Text('Log Out', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w600)),
                  onTap: () async {
                    await FirebaseAuth.instance.signOut();
                    if (context.mounted) Navigator.pop(context);
                  },
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _drawerItem(BuildContext context, IconData icon, String title, Widget page) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ListTile(
      leading: Icon(icon, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
      title: Text(title, style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight, fontWeight: FontWeight.w600)),
      onTap: () {
        Navigator.pop(context);
        Navigator.push(context, MaterialPageRoute(builder: (context) => page));
      },
    );
  }
}

// --- DASHBOARD PAGE ---
class DashboardPage extends StatefulWidget {
  final VoidCallback onMenuTap;
  const DashboardPage({super.key, required this.onMenuTap});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  String _selectedCategory = 'All';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  // Filters
  String? _fBhk;
  String? _fSharing;
  String? _fGender;

  late Stream<QuerySnapshot> _propertiesStream;

  @override
  void initState() {
    super.initState();
    _propertiesStream = FirebaseFirestore.instance
        .collection('posts')
        .orderBy('createdAt', descending: true)
        .limit(50) // Reduced from infinite to 50 for performance
        .snapshots();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showFilterSheet() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? AppColors.bgDark : AppColors.bgLight,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Filters', style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold)),
                    TextButton(
                      onPressed: () {
                        setModalState(() {
                          _fBhk = null;
                          _fSharing = null;
                          _fGender = null;
                        });
                      },
                      child: const Text('Clear All', style: TextStyle(color: Colors.redAccent)),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                
                // BHK Filter
                Text('Apartment Type', style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  children: ['1BHK', '2BHK', '3BHK', '4BHK'].map((e) {
                    bool selected = _fBhk == e;
                    return ChoiceChip(
                      label: Text(e),
                      selected: selected,
                      onSelected: (v) => setModalState(() => _fBhk = v ? e : null),
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(color: selected ? Colors.white : (isDark ? Colors.white70 : Colors.black87)),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),

                // Sharing Filter
                Text('PG Sharing', style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  children: ['1x Sharing', '2x Sharing', '3x Sharing', '4x Sharing'].map((e) {
                    bool selected = _fSharing == e;
                    return ChoiceChip(
                      label: Text(e),
                      selected: selected,
                      onSelected: (v) => setModalState(() => _fSharing = v ? e : null),
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(color: selected ? Colors.white : (isDark ? Colors.white70 : Colors.black87)),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),

                // Gender Filter
                Text('PG For', style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  children: ['Girls PG', 'Boys PG', 'Co-ed PG'].map((e) {
                    bool selected = _fGender == e;
                    return ChoiceChip(
                      label: Text(e),
                      selected: selected,
                      onSelected: (v) => setModalState(() => _fGender = v ? e : null),
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(color: selected ? Colors.white : (isDark ? Colors.white70 : Colors.black87)),
                    );
                  }).toList(),
                ),

                const SizedBox(height: 30),
                SizedBox(
                  width: double.infinity,
                  height: 55,
                  child: ElevatedButton(
                    onPressed: () {
                      setState(() {});
                      Navigator.pop(context);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                    ),
                    child: const Text('Apply Filters', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
                const SizedBox(height: 30),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          _buildHeader(context),
          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHero(context),
                  const SizedBox(height: 10),
                  _buildCategories(context),
                  const SizedBox(height: 10),
                  _buildSectionTitle(context, 'Featured Properties'),
                  _buildPropertiesList(),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = FirebaseAuth.instance.currentUser;
    final String welcomeName = user?.displayName?.split(' ').first ?? 'Explorer';
    final String formattedDate = DateFormat('EEEE, dd MMM').format(DateTime.now());

    return Container(
      padding: const EdgeInsets.fromLTRB(15, 15, 20, 10),
      child: Row(
        children: [
          IconButton(
            icon: Icon(LineIcons.bars, size: 26, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
            onPressed: widget.onMenuTap,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Hello, $welcomeName 👋 [LIVE]', 
                  style: GoogleFonts.outfit(
                    fontSize: 20, 
                    fontWeight: FontWeight.bold, 
                    color: isDark ? AppColors.textMainDark : AppColors.textMainLight
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  formattedDate, 
                  style: TextStyle(
                    fontSize: 12, 
                    fontWeight: FontWeight.w500,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight
                  )
                ),
              ],
            ),
          ),
          StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance
                .collection('notifications')
                .where('targetId', isEqualTo: FirebaseAuth.instance.currentUser?.uid)
                .where('status', isEqualTo: 'unread')
                .snapshots(),
            builder: (context, snapshot) {
              int unreadCount = snapshot.hasData ? snapshot.data!.docs.length : 0;
              return Stack(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.bgCardDark : Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
                    ),
                    child: IconButton(
                      icon: Icon(LineIcons.bell, size: 24, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const NotificationsInboxPage())),
                    ),
                  ),
                  if (unreadCount > 0)
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                        constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                        child: Text(
                          unreadCount > 9 ? '9+' : '$unreadCount',
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildHero(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Stack(
        children: [
          Container(
            height: 300,
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(32),
              image: const DecorationImage(
                image: NetworkImage('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200'),
                fit: BoxFit.cover,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                )
              ],
            ),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(32),
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.1),
                    Colors.black.withOpacity(0.7),
                  ],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Pill Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.auto_awesome, size: 14, color: Color(0xFF1AA79C)),
                        SizedBox(width: 8),
                        Text(
                          'New Modern Stays Available',
                          style: TextStyle(
                            color: Color(0xFF1AA79C),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  // Headline
                  Text(
                    'Find a place that\nfits your life.',
                    style: GoogleFonts.outfit(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Search Bar inside Hero
                  Container(
                    height: 60,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1F2937).withOpacity(0.95),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.white10),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        const Icon(LineIcons.search, color: Colors.white60, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            onChanged: (v) => setState(() => _searchQuery = v.toLowerCase()),
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            decoration: const InputDecoration(
                              hintText: 'Search by city or area...',
                              hintStyle: TextStyle(color: Colors.white54, fontSize: 14),
                              border: InputBorder.none,
                              isDense: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: _showFilterSheet,
                          child: const Icon(LineIcons.filter, color: Color(0xFF1AA79C), size: 22),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategories(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final List<Map<String, dynamic>> cats = [
      {'name': 'All', 'icon': LineIcons.compass},
      {'name': 'Apartment', 'icon': LineIcons.building},
      {'name': 'PG', 'icon': LineIcons.hotel},
      {'name': 'Room', 'icon': LineIcons.bed},
      {'name': 'Villa', 'icon': LineIcons.home},
    ];
    return Container(
      height: 55,
      margin: const EdgeInsets.symmetric(vertical: 5),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        physics: const BouncingScrollPhysics(),
        itemCount: cats.length,
        itemBuilder: (context, index) {
          final cat = cats[index]['name'];
          final isSelected = _selectedCategory == cat;
          return GestureDetector(
            onTap: () => setState(() => _selectedCategory = cat),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : (isDark ? AppColors.bgCardDark : Colors.white),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: isSelected ? AppColors.primary : (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5)),
                boxShadow: [
                  if (isSelected) BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))
                ],
              ),
              child: Row(
                children: [
                  Icon(cats[index]['icon'], size: 20, color: isSelected ? Colors.white : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                  const SizedBox(width: 8),
                  Text(cat, style: TextStyle(color: isSelected ? Colors.white : (isDark ? AppColors.textMainDark : AppColors.textMainLight), fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 30, 20, 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
          TextButton(
            onPressed: () {},
            child: const Row(
              children: [
                Text('View All', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                SizedBox(width: 4),
                Icon(LineIcons.arrowRight, size: 14, color: AppColors.primary),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildPropertiesList() {
    return StreamBuilder<QuerySnapshot>(
      stream: _propertiesStream,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
          return const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));
        }
        if (snapshot.hasError) return Center(child: Text("Error loading properties"));
        if (!snapshot.hasData) return const SizedBox.shrink();

        var docs = snapshot.data!.docs;

        // Apply Local Filtering (Very fast for < 100 items)
        final filteredDocs = docs.where((doc) {
          final data = doc.data() as Map<String, dynamic>;
          final type = (data['propertyType'] ?? '').toString().toLowerCase();
          final unit = (data['unitType'] ?? '').toString().toLowerCase();
          final room = (data['roomType'] ?? '').toString().toLowerCase();
          final name = (data['propertyName'] ?? '').toString().toLowerCase();
          final city = (data['city'] ?? '').toString().toLowerCase();
          
          if (_selectedCategory != 'All') {
            final cat = _selectedCategory.toLowerCase();
            if (!type.contains(cat)) return false;
          }

          if (_searchQuery.isNotEmpty) {
            final q = _searchQuery.toLowerCase();
            if (!name.contains(q) && !city.contains(q) && !type.contains(q)) return false;
          }

          if (_fBhk != null && !unit.contains(_fBhk!.toLowerCase())) return false;
          if (_fSharing != null && !room.contains(_fSharing!.toLowerCase())) return false;
          if (_fGender != null) {
            final g = _fGender!.toLowerCase().split(' ').first;
            if (!unit.contains(g) && !type.contains(g)) return false;
          }

          return true;
        }).toList();

        if (filteredDocs.isEmpty) {
          return const Padding(padding: EdgeInsets.all(40), child: Center(child: Text("No properties found")));
        }
        
        // Use ListView.builder for MUCH better performance
        return ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: filteredDocs.length,
          itemBuilder: (context, index) {
            final data = filteredDocs[index].data() as Map<String, dynamic>;
            final docId = filteredDocs[index].id;
            return PropertyCard(
              id: docId,
              name: data['propertyName'] ?? 'StayZen Stay',
              location: '${data['colonyArea'] ?? ''}, ${data['city'] ?? 'India'}',
              price: data['monthlyRent']?.toString().startsWith('₹') == true ? data['monthlyRent'] : '₹${data['monthlyRent'] ?? '0'}/mo',
              image: (data['imageUrls'] != null && data['imageUrls'].isNotEmpty) ? data['imageUrls'][0] : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
              type: data['propertyType'] ?? 'Stay',
              unitType: data['unitType'],
              roomType: data['roomType'],
              fullData: data,
            );
          },
        );
      },
    );
  }
}

// --- BOOKINGS PAGE ---
class BookingsPage extends StatefulWidget {
  const BookingsPage({super.key});

  @override
  State<BookingsPage> createState() => _BookingsPageState();
}

class _BookingsPageState extends State<BookingsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late PaymentBridge _paymentBridge;
  String? _currentPayingBookingId;
  Map<String, dynamic>? _currentPayingData;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _paymentBridge = getPaymentBridge();
    _paymentBridge.init(
      (id) => _processPaymentSuccess(id),
      (err) => _processPaymentError(err),
    );
  }

  @override
  void dispose() {
    _paymentBridge.dispose();
    _tabController.dispose();
    super.dispose();
  }

  void _processPaymentSuccess(String? paymentId) async {
    if (_currentPayingBookingId == null) return;
    
    await FirebaseFirestore.instance.collection('bookings').doc(_currentPayingBookingId).update({'status': 'Advance Paid'});
    
    // FETCH OWNER ID for the transaction record
    final bookingDoc = await FirebaseFirestore.instance.collection('bookings').doc(_currentPayingBookingId).get();
    final bData = bookingDoc.data();
    
    await FirebaseFirestore.instance.collection('payments').add({
      'bookingId': _currentPayingBookingId,
      'userId': FirebaseAuth.instance.currentUser?.uid,
      'ownerId': bData?['ownerId'], // Critical for Manager Dashboard sync
      'userName': bData?['userName'] ?? 'Guest',
      'renterName': bData?['userName'] ?? 'Guest',
      'amount': _currentPayingData?['advanceAmount']?.toString().replaceAll(RegExp(r'[^0-9]'), '') ?? '500',
      'propertyName': _currentPayingData?['propertyName'] ?? 'Stay',
      'property': _currentPayingData?['propertyName'] ?? 'Stay',
      'date': FieldValue.serverTimestamp(),
      'status': 'Completed',
      'statusText': 'Completed',
      'type': 'Advance Payment',
      'paymentMethod': 'Razorpay',
      'razorpayId': paymentId,
      'createdAt': DateTime.now().toIso8601String(), // Web expects ISO string sometimes
    });
    
    // 🔔 Notify Manager about Payment
    if (bData?['ownerId'] != null) {
      await FirebaseFirestore.instance.collection('notifications').add({
        'type': 'PAYMENT_RECEIVED',
        'title': 'Advance Payment Received',
        'message': 'Advance payment for ${bData!['propertyName']} has been received. Please verify residency.',
        'targetId': bData['ownerId'],
        'status': 'unread',
        'createdAt': DateTime.now().toIso8601String(),
      });
    }

    // 🔔 Notify User (If Push Enabled)
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      try {
        final settings = await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .collection('settings')
            .doc('notifications')
            .get();
        
        final pushEnabled = settings.data()?['pushEnabled'] ?? true; // Default to true

        if (pushEnabled) {
          await FirebaseFirestore.instance.collection('notifications').add({
            'userId': user.uid,
            'type': 'PAYMENT_RECEIVED',
            'title': 'Payment Successful',
            'message': 'Your advance payment of ₹${_currentPayingData?['advanceAmount'] ?? '500'} for ${bData?['propertyName']} was successful.',
            'status': 'unread',
            'isRead': false,
            'createdAt': DateTime.now().toIso8601String(),
          });
        }
      } catch (e) {
        print('Error sending user notification: $e');
      }
    }
    
    _showSuccess('Payment Successful! Waiting for owner approval.');

    setState(() {
      _currentPayingBookingId = null;
      _currentPayingData = null;
    });
  }

  void _processPaymentError(String? message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Payment Failed: $message'), backgroundColor: Colors.redAccent));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('My Bookings', style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.bold, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
                  IconButton(icon: Icon(LineIcons.archive, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight), onPressed: () {}),
                ],
              ),
            ),
            TabBar(
              controller: _tabController,
              indicatorColor: AppColors.primary,
              labelColor: AppColors.primary,
              unselectedLabelColor: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              dividerColor: Colors.transparent,
              tabs: const [
                Tab(text: 'Pending Payments'),
                Tab(text: 'Booked'),
              ],
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildRealBookingList(['Pending', 'Advance Paid', 'Upcoming']),
                  _buildRealBookingList(['Booked', 'Confirmed', 'Completed']),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildRealBookingList(List<String> statuses) {
    final user = FirebaseAuth.instance.currentUser;
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('bookings')
          .where('userId', isEqualTo: user?.uid)
          .where('status', whereIn: statuses)
          .snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        final docs = snapshot.data!.docs;
        if (docs.isEmpty) return _buildBookingEmptyState(statuses.contains('Pending') ? 'No pending payments bookings' : 'No booked stays yet');

        return ListView.builder(
          padding: const EdgeInsets.all(20),
          itemCount: docs.length,
          itemBuilder: (context, index) {
            final data = docs[index].data() as Map<String, dynamic>;
            final bookingId = docs[index].id;
            final isDark = Theme.of(context).brightness == Brightness.dark;
            return Container(
              margin: const EdgeInsets.only(bottom: 20),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: isDark ? AppColors.bgCardDark : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5)),
                boxShadow: [
                  if (!isDark) BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 5))
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Row(
                    children: [
                      commonBuildImage(data['propertyImage'] as String?, width: 80, height: 80, borderRadius: 12),
                      const SizedBox(width: 15),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                          Text(data['propertyName'] ?? 'Stay', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
                          if (data['propertyType'] != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(
                                (data['propertyType'] as String).toUpperCase(), 
                                style: const TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.w800),
                              ),
                            ),
                            Row(
                              children: [
                                Icon(Icons.location_on_outlined, size: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                const SizedBox(width: 4),
                                Expanded(child: Text(data['propertyLocation'] ?? '', style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis)),
                              ],
                            ),
                            const SizedBox(height: 5),
                            Row(
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(data['price']?.toString().startsWith('₹') == true ? data['price'] : '₹${data['price'] ?? ''}', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                                    Builder(builder: (context) {
                                      final propertyType = data['propertyType']?.toString() ?? '';
                                      final unitType = data['unitType']?.toString();
                                      
                                      List<String> subs = [];
                                      final separators = ['•', '·', '-', '|'];
                                      for (var sep in separators) {
                                        if (propertyType.contains(sep)) {
                                          final parts = propertyType.split(sep);
                                          subs.addAll(parts.skip(1).map((e) => e.trim()));
                                          break;
                                        }
                                      }
                                      
                                      if (unitType != null && unitType.isNotEmpty && unitType.toLowerCase() != 'not specified') {
                                        if (!subs.any((s) => s.toLowerCase() == unitType.toLowerCase())) {
                                          subs.add(unitType);
                                        }
                                      }

                                      if (subs.isEmpty) return const SizedBox.shrink();
                                      return Text(
                                        subs.join(' • ').toUpperCase(), 
                                        style: const TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.w800)
                                      );
                                    }),
                                  ],
                                ),
                                const Spacer(),
                                if (data['moveInDate'] != null)
                                  Text('Move-in: ${data['moveInDate']}', style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.w600)),
                              ],
                            ),
                          ],
                        ),
                      )
                    ],
                  ),
                  const Divider(color: AppColors.borderDark, height: 40),
                  if (data['status'] == 'Pending' || data['status'] == 'Upcoming') ...[
                    const Text('Advance Payment Required', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber)),
                    Text('Amount: ${data['advanceAmount']?.toString().startsWith('₹') == true ? data['advanceAmount'] : '₹${data['advanceAmount'] ?? '500'}'}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () => _handleAdvancePayment(bookingId, data),
                            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                            child: const Text('Pay Advance', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        IconButton(
                          onPressed: () => _cancelBooking(bookingId),
                          icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                          tooltip: 'Cancel Booking',
                        ),
                      ],
                    )
                  ] else if (data['status'] == 'Advance Paid') ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.access_time_filled, color: Colors.amber, size: 20),
                            SizedBox(width: 8),
                            Text('Waiting for Approval', style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        TextButton(
                          onPressed: () => _cancelBooking(bookingId),
                          child: const Text('Cancel', style: TextStyle(color: Colors.redAccent, fontSize: 13)),
                        ),
                      ],
                    )
                  ] else ...[
                    // Booked/Confirmed - Show balance
                    StreamBuilder<QuerySnapshot>(
                      stream: FirebaseFirestore.instance
                          .collection('renters')
                          .where('userId', isEqualTo: user?.uid)
                          .where('property', isEqualTo: data['propertyName'])
                          .limit(1)
                          .snapshots(),
                      builder: (context, renterSnapshot) {
                        if (renterSnapshot.hasData && renterSnapshot.data!.docs.isNotEmpty) {
                          final renterData = renterSnapshot.data!.docs.first.data() as Map<String, dynamic>;
                          final rentAmount = int.tryParse(renterData['rentAmount']?.toString() ?? '0') ?? 0;
                          final paidAmount = int.tryParse(renterData['paidAmount']?.toString() ?? '0') ?? 0;
                          final balance = rentAmount - paidAmount;
                          
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.check_circle, color: Colors.green, size: 20),
                                  SizedBox(width: 8),
                                  Text('Booking Confirmed', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              const SizedBox(height: 15),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: balance > 0 ? Colors.orange.withOpacity(0.1) : Colors.green.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: balance > 0 ? Colors.orange : Colors.green,
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Monthly Rent',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: AppColors.textMuted,
                                          ),
                                        ),
                                        Text(
                                          '₹${rentAmount.toStringAsFixed(0)}',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Paid',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: AppColors.textMuted,
                                          ),
                                        ),
                                        Text(
                                          '₹${paidAmount.toStringAsFixed(0)}',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.green,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Balance',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: AppColors.textMuted,
                                          ),
                                        ),
                                        Text(
                                          '₹${balance.toStringAsFixed(0)}',
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: balance > 0 ? Colors.orange : Colors.green,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          );
                        }
                        return const Row(
                          children: [
                            Icon(Icons.check_circle, color: Colors.green, size: 20),
                            SizedBox(width: 8),
                            Text('Booking Confirmed', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                          ],
                        );
                      },
                    ),
                  ]
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _cancelBooking(String bookingId) async {
    bool? confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Booking?'),
        content: const Text('Are you sure you want to cancel this booking request?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Yes, Cancel', style: TextStyle(color: Colors.redAccent))),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await FirebaseFirestore.instance.collection('bookings').doc(bookingId).delete();
        _showSuccess('Booking cancelled successfully');
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _handleAdvancePayment(String bookingId, Map<String, dynamic> data) async {
    _currentPayingBookingId = bookingId;
    _currentPayingData = data;

    final amountStr = data['advanceAmount']?.toString().replaceAll(RegExp(r'[^0-9]'), '') ?? '500';
    final amount = (int.tryParse(amountStr) ?? 500) * 100; // Calculate in paise

    var options = {
      'key': 'rzp_test_S5fEDvgiK3b2fh', // TEST MODE key
      'amount': amount,
      'name': 'StayZen',
      'description': 'Advance Payment for ${data['propertyName']}',
      'prefill': {
        'contact': FirebaseAuth.instance.currentUser?.phoneNumber ?? '',
        'email': FirebaseAuth.instance.currentUser?.email ?? ''
      },
      'external': {
        'wallets': ['paytm']
      }
    };

    _paymentBridge.openCheckout(options);
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppColors.primary));
  }

  Widget _buildBookingEmptyState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(25),
            decoration: const BoxDecoration(color: AppColors.bgCardDark, shape: BoxShape.circle),
            child: Icon(LineIcons.calendar, size: 40, color: AppColors.primary.withOpacity(0.5)),
          ),
          const SizedBox(height: 20),
          Text(message, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textMain)),
          const SizedBox(height: 10),
          const Text('When you book a stay, it will appear here\nfor easy management.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: 30),
          ElevatedButton(
            onPressed: () {
              Provider.of<AppState>(context, listen: false).setIndex(0);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
            ),
            child: const Text('Explore Properties', style: TextStyle(fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }
}

// --- PAYMENTS PAGE ---
class PaymentsPage extends StatelessWidget {
  const PaymentsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    final textColor = isDark ? AppColors.textMainDark : AppColors.textMainLight;
    final mutedColor = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgCardLight,
      appBar: AppBar(
        title: Text('Payments', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance.collection('payments').where('userId', isEqualTo: user?.uid).snapshots(),
        builder: (context, snapshot) {
          final transactions = snapshot.data?.docs ?? [];
          
          return StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance
                .collection('renters')
                .where('userId', isEqualTo: user?.uid)
                .snapshots(),
            builder: (context, renterSnapshot) {
              int totalBalance = 0;
              int totalRent = 0;
              int totalPaid = 0;
              Map<String, dynamic>? activeRenter;
              
              final renters = renterSnapshot.data?.docs ?? [];
              for (var doc in renters) {
                final rData = doc.data() as Map<String, dynamic>;
                final rentAmount = int.tryParse(rData['rentAmount']?.toString() ?? '0') ?? 0;
                final paidAmount = int.tryParse(rData['paidAmount']?.toString() ?? '0') ?? 0;
                final balance = rentAmount - paidAmount;
                
                totalRent += rentAmount;
                totalPaid += paidAmount;
                totalBalance += balance;
                
                if (activeRenter == null && balance > 0) {
                  activeRenter = {
                    ...rData,
                    'propertyName': rData['property'] ?? 'Stay',
                    'ownerId': rData['ownerId'],
                  };
                }
              }

              return SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // --- Balance Card (Premium Gradient) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [AppColors.primary, AppColors.primary.withOpacity(0.8)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(30),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          )
                        ],
                      ),
                      child: Column(
                        children: [
                          const Text('Current Balance Due', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w500)),
                          const SizedBox(height: 8),
                          Text(
                            '₹${NumberFormat('#,##,###').format(totalBalance)}',
                            style: GoogleFonts.outfit(fontSize: 42, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              _buildMiniStat('Monthly Rent', '₹$totalRent', Colors.white, Colors.white60),
                              Container(width: 1, height: 30, color: Colors.white24),
                              _buildMiniStat('Total Paid', '₹$totalPaid', Colors.white, Colors.white60),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 25),
                    
                    // Proceed to Payment Button
                    if (totalBalance > 0 && activeRenter != null)
                      SizedBox(
                        width: double.infinity,
                        height: 58,
                        child: ElevatedButton(
                          onPressed: () => _handleMonthlyPayment(context, totalBalance, activeRenter!),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                          ),
                          child: const Text('Proceed to Payment', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ),
                      ),
                    
                    const SizedBox(height: 35),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Transaction History', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: textColor)),
                        TextButton(onPressed: () {}, child: const Text('View All', style: TextStyle(color: AppColors.primary, fontSize: 13))),
                      ],
                    ),
                    const SizedBox(height: 15),
                    
                    if (transactions.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 40),
                          child: Column(
                            children: [
                              Icon(LineIcons.receipt, size: 60, color: mutedColor.withOpacity(0.3)),
                              const SizedBox(height: 10),
                              Text('No transaction history found', style: TextStyle(color: mutedColor)),
                            ],
                          ),
                        ),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: transactions.length,
                        itemBuilder: (context, index) {
                          final data = transactions[index].data() as Map<String, dynamic>;
                          final date = data['date'] != null ? (data['date'] as Timestamp).toDate() : DateTime.now();
                          final formattedDate = DateFormat('MMM dd, yyyy').format(date);
                          
                          return _buildTransactionItem(
                            context,
                            data['type'] ?? 'Rent Payment',
                            formattedDate,
                            data['status'] ?? 'Success',
                            '${data['amount']}',
                            data['propertyName'] ?? 'StayZen',
                            isDark,
                          );
                        },
                      ),
                  ],
                ),
              );
            }
          );
        }
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, Color valCol, Color labelCol) {
    return Column(
      children: [
        Text(label, style: TextStyle(fontSize: 12, color: labelCol)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: valCol)),
      ],
    );
  }

  void _handleMonthlyPayment(BuildContext context, int amount, Map<String, dynamic> bookingData) {
    var options = {
      'key': 'rzp_test_S5fEDvgiK3b2fh', // TEST MODE key
      'amount': amount * 100,
      'name': 'StayZen',
      'description': 'Monthly Rent for ${bookingData['propertyName']}',
      'prefill': {
        'contact': FirebaseAuth.instance.currentUser?.phoneNumber ?? '',
        'email': FirebaseAuth.instance.currentUser?.email ?? ''
      },
    };

    final bridge = getPaymentBridge();
    bridge.init((paymentId) async {
      await FirebaseFirestore.instance.collection('payments').add({
        'userId': FirebaseAuth.instance.currentUser?.uid,
        'ownerId': bookingData['ownerId'],
        'userName': FirebaseAuth.instance.currentUser?.displayName ?? 'Guest',
        'renterName': FirebaseAuth.instance.currentUser?.displayName ?? 'Guest',
        'amount': amount.toString(),
        'propertyName': bookingData['propertyName'],
        'property': bookingData['propertyName'],
        'date': FieldValue.serverTimestamp(),
        'status': 'Completed',
        'statusText': 'Completed',
        'type': 'Monthly Rent',
        'paymentMethod': 'Razorpay',
        'razorpayId': paymentId,
        'createdAt': DateTime.now().toIso8601String(),
      });

      // 🔄 SYNC TO RENTERS: Update the paidAmount in renters collection
      try {
        final renterQuery = await FirebaseFirestore.instance
            .collection('renters')
            .where('userId', isEqualTo: FirebaseAuth.instance.currentUser?.uid)
            .where('property', isEqualTo: bookingData['propertyName'])
            .limit(1)
            .get();

        if (renterQuery.docs.isNotEmpty) {
          final renterId = renterQuery.docs.first.id;
          final currentPaid = int.tryParse(renterQuery.docs.first.data()['paidAmount']?.toString() ?? '0') ?? 0;
          await FirebaseFirestore.instance.collection('renters').doc(renterId).update({
            'paidAmount': currentPaid + amount,
            'updatedAt': DateTime.now().toIso8601String(),
          });
        }
      } catch (e) {
        print("Error syncing to renter: $e");
      }

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Monthly Rent Paid Successfully!'), backgroundColor: AppColors.primary));
      }
      bridge.dispose();
    }, (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Payment Failed: $error'), backgroundColor: Colors.redAccent));
      }
      bridge.dispose();
    });

    bridge.openCheckout(options);
  }

  Widget _buildTransactionItem(BuildContext context, String title, String date, String status, String amount, String property, bool isDark) {
    final cardBg = isDark ? AppColors.bgCardDark : Colors.white;
    final borderCol = isDark ? AppColors.borderDark : AppColors.borderLight;
    final textColor = isDark ? AppColors.textMainDark : AppColors.textMainLight;
    final mutedColor = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderCol),
        boxShadow: [
          if (!isDark) 
            BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(LineIcons.wallet, color: AppColors.primary, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: textColor)),
                const SizedBox(height: 2),
                Text(property, style: TextStyle(color: mutedColor, fontSize: 12)),
                Text(date, style: TextStyle(color: mutedColor, fontSize: 11)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('₹$amount', style: GoogleFonts.outfit(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: (status.toLowerCase() == 'completed' || status.toLowerCase() == 'success')
                    ? Colors.green.withOpacity(0.1) 
                    : Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: TextStyle(
                    color: (status.toLowerCase() == 'completed' || status.toLowerCase() == 'success') ? Colors.green : Colors.orange,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// --- FEEDBACK PAGE ---
class FeedbackPage extends StatefulWidget {
  const FeedbackPage({super.key});

  @override
  State<FeedbackPage> createState() => _FeedbackPageState();
}

class _FeedbackPageState extends State<FeedbackPage> {
  int _rating = 0;
  final TextEditingController _feedbackController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  Future<void> _submitFeedback() async {
    if (_rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a rating'), backgroundColor: Colors.orange));
      return;
    }
    if (_feedbackController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter your comments'), backgroundColor: Colors.orange));
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final user = FirebaseAuth.instance.currentUser;
      await FirebaseFirestore.instance.collection('feedback').add({
        'userId': user?.uid,
        'userName': user?.displayName ?? 'StayZen User',
        'userEmail': user?.email ?? 'Unknown',
        'rating': _rating,
        'message': _feedbackController.text.trim(),
        'createdAt': DateTime.now().toIso8601String(),
        'status': 'new'
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thank you for your feedback!'), backgroundColor: AppColors.primary));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.redAccent));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        title: Text('Send Feedback', style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight)), 
        centerTitle: true, 
        elevation: 0,
        leading: IconButton(
          icon: Icon(LineIcons.angleLeft, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            Text('How was your experience?', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
            const SizedBox(height: 8),
            Text('Your feedback helps us improve StayZen for everyone.', style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
            const SizedBox(height: 30),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) {
                final starIndex = index + 1;
                return IconButton(
                  onPressed: () => setState(() => _rating = starIndex),
                  icon: Icon(
                    _rating >= starIndex ? Icons.star : Icons.star_border,
                    size: 40,
                    color: _rating >= starIndex ? const Color(0xFFFFB800) : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                  ),
                );
              }),
            ),
            const SizedBox(height: 30),
            TextField(
              controller: _feedbackController,
              maxLines: 5,
              style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
              decoration: InputDecoration(
                hintText: 'Tell us what you liked or how we can improve...',
                fillColor: isDark ? AppColors.bgCardDark : AppColors.bgCardLight,
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight, width: 1)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: AppColors.primary, width: 1)),
                hintStyle: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
              ),
            ),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submitFeedback,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
                child: _isSubmitting
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LineIcons.paperPlane, color: Colors.white, size: 20),
                        SizedBox(width: 10),
                        Text('Submit Feedback', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ],
                    ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

// --- FAVORITES (WISHLIST) PAGE ---
class FavoritesPage extends StatelessWidget {
  const FavoritesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = FirebaseAuth.instance.currentUser;
    
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Text('My Favorites', style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.w800)),
          ),
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance
                  .collection('favorites')
                  .where('userId', isEqualTo: user?.uid)
                  .snapshots(),
              builder: (context, snapshot) {
                if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
                final docs = snapshot.data!.docs;
                if (docs.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LineIcons.heart, size: 80, color: (isDark ? AppColors.textMutedDark : AppColors.textMutedLight).withOpacity(0.3)),
                        const SizedBox(height: 10),
                        const Text('Your favorites list is empty.'),
                        const SizedBox(height: 5),
                        const Text('Tap the heart icon on properties to save them here.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      ],
                    ),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 0),
                  itemCount: docs.length,
                  itemBuilder: (context, index) {
                    final data = docs[index].data() as Map<String, dynamic>;
                    final propertyData = data['propertyData'] as Map<String, dynamic>? ?? {};
                    
                    return PropertyCard(
                      id: data['propertyId'] ?? docs[index].id,
                      name: data['propertyName'] ?? 'Stay',
                      location: data['propertyLocation'] ?? '',
                      price: data['propertyPrice']?.toString().startsWith('₹') == true ? data['propertyPrice'] : '₹${data['propertyPrice'] ?? '0'}/mo',
                      image: data['propertyImage'] ?? 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
                      type: data['propertyType'] ?? 'Stay',
                      unitType: data['unitType'] ?? propertyData['unitType'],
                      roomType: data['roomType'] ?? propertyData['roomType'],
                      fullData: propertyData,
                    );
                  },
                );
              },
            ),
          )
        ],
      ),
    );
  }
}

// --- PROFILE PAGE ---
class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;
    final now = DateTime.now();
    final formattedDate = DateFormat('EEEE, MMMM d, y h:mm a').format(now);
    
    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        leading: IconButton(
          icon: Icon(LineIcons.angleLeft, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
          onPressed: () => Navigator.maybePop(context),
        ),
        title: Text(formattedDate, style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          children: [
            const SizedBox(height: 10),
            
            // --- Avatar Section ---
            Center(
              child: Stack(
                children: [
                  Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: isDark ? AppColors.bgCardDark : Colors.white, width: 8),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        )
                      ],
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6DE195), Color(0xFF277BA8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: ClipOval(
                      child: user?.photoURL != null 
                        ? Image.network(user!.photoURL!, fit: BoxFit.cover)
                        : Icon(LineIcons.user, size: 80, color: Colors.white.withOpacity(0.9)),
                    ),
                  ),
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary, 
                        shape: BoxShape.circle,
                        border: Border.all(color: isDark ? AppColors.bgDark : Colors.white, width: 3),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)
                        ]
                      ),
                      child: const Icon(LineIcons.camera, size: 20, color: Colors.white),
                    ),
                  )
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            Text(
              user?.displayName ?? 'yashwanth', 
              style: GoogleFonts.outfit(
                fontSize: 32, 
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.textMainDark : const Color(0xFF1E293B),
              )
            ),
            const SizedBox(height: 4),
            Text(
              user?.email ?? 'yashuyashwanth9346@gmail.com', 
              style: TextStyle(
                fontSize: 14,
                color: isDark ? AppColors.textMutedDark : const Color(0xFF94A3B8),
              )
            ),
            
            const SizedBox(height: 48),
            
            // --- Action items ---
            _profileItem(
              context: context, 
              icon: LineIcons.user, 
              title: 'Personal information', 
              page: const PersonalInfoPage(), 
              isDark: isDark,
              iconBg: const Color(0xFFE0F2F1),
              iconColor: const Color(0xFF1AA79C),
            ),
            _profileItem(
              context: context, 
              icon: LineIcons.bell, 
              title: 'Notification Settings', 
              page: const NotificationSettingsPage(), 
              isDark: isDark,
              iconBg: const Color(0xFFE0F7FA),
              iconColor: const Color(0xFF00ACC1),
            ),
            _profileItem(
              context: context, 
              icon: LineIcons.lock, 
              title: 'Login & Security', 
              page: const SecurityPage(), 
              isDark: isDark,
              iconBg: const Color(0xFFE0F2F1),
              iconColor: const Color(0xFF1AA79C),
            ),
            _profileItem(
              context: context, 
              icon: LineIcons.eye, 
              title: 'Appearance', 
              page: const AppearancePage(), 
              isDark: isDark,
              iconBg: const Color(0xFFF1F5F9),
              iconColor: const Color(0xFF64748B),
            ),
            _profileItem(
              context: context, 
              icon: LineIcons.infoCircle, 
              title: 'About Us', 
              page: const AboutUsPage(), 
              isDark: isDark,
              iconBg: const Color(0xFFFFF7ED),
              iconColor: const Color(0xFFF97316),
            ),
            
            const SizedBox(height: 8),
            
            // --- Logout item ---
            _profileItem(
              context: context, 
              icon: LineIcons.alternateSignOut, 
              title: 'Logout', 
              onTap: () => FirebaseAuth.instance.signOut(),
              isDark: isDark,
              iconBg: const Color(0xFFFEF2F2),
              iconColor: const Color(0xFFEF4444),
              isDestructive: true,
            ),
            
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _profileItem({
    required BuildContext context, 
    required IconData icon, 
    required String title, 
    Widget? page, 
    VoidCallback? onTap,
    required bool isDark,
    required Color iconBg,
    required Color iconColor,
    bool isDestructive = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.bgCardDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
        border: Border.all(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? iconColor.withOpacity(0.1) : iconBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: iconColor, size: 24),
        ),
        title: Text(
          title, 
          style: TextStyle(
            fontWeight: FontWeight.w700, 
            fontSize: 16,
            color: isDestructive 
                ? const Color(0xFFEF4444) 
                : (isDark ? AppColors.textMainDark : const Color(0xFF1F2937)),
          )
        ),
        trailing: Icon(
          LineIcons.angleRight, 
          size: 18, 
          color: isDark ? AppColors.textMutedDark : const Color(0xFF94A3B8)
        ),
        onTap: onTap ?? () => Navigator.push(context, MaterialPageRoute(builder: (context) => page!)),
      ),
    );
  }
}

// --- PROFILE SUB-PAGES ---

class PersonalInfoPage extends StatefulWidget {
  const PersonalInfoPage({super.key});

  @override
  State<PersonalInfoPage> createState() => _PersonalInfoPageState();
}

class _PersonalInfoPageState extends State<PersonalInfoPage> {
  bool isEditing = false;
  bool isLoading = false;

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _dobController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  
  String? _selectedGender;
  final List<String> _genders = ['Male', 'Female', 'Other', 'Prefer not to say'];

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _dobController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
      setState(() => isLoading = true);
      try {
          final user = FirebaseAuth.instance.currentUser;
          if (user == null) return;

          await FirebaseFirestore.instance.collection('users').doc(user.uid).update({
              'displayName': _nameController.text.trim(),
              'name': _nameController.text.trim(),
              'phoneNumber': _phoneController.text.trim(),
              'phone': _phoneController.text.trim(),
              'gender': _selectedGender,
              'dob': _dobController.text.trim(),
              'address': _addressController.text.trim(),
              'updatedAt': DateTime.now().toIso8601String(),
          });
          
          if (user.displayName != _nameController.text.trim()) {
              await user.updateDisplayName(_nameController.text.trim());
          }

          if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                    content: Text('Profile updated successfully'), 
                    backgroundColor: AppColors.primary
                )
              );
              setState(() => isEditing = false);
          }
      } catch (e) {
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      } finally {
          if (mounted) setState(() => isLoading = false);
      }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return const Scaffold(body: Center(child: Text('Please log in')));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
          title: const Text('Profile Details', style: TextStyle(fontWeight: FontWeight.bold)), 
          centerTitle: true, 
          elevation: 0,
          backgroundColor: Colors.transparent,
          foregroundColor: isDark ? Colors.white : Colors.black,
          actions: [
              if (!isEditing)
              TextButton.icon(
                  onPressed: () => setState(() => isEditing = true),
                  icon: const Icon(LineIcons.edit, size: 18),
                  label: const Text("Edit"),
                  style: TextButton.styleFrom(foregroundColor: AppColors.primary),
              )
          ],
      ),
      body: StreamBuilder<DocumentSnapshot>(
        stream: FirebaseFirestore.instance.collection('users').doc(user.uid).snapshots(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final data = snapshot.data?.data() as Map<String, dynamic>? ?? {};

          // Auto-fill controllers when entering edit mode
          if (isEditing && _nameController.text.isEmpty && !isLoading) {
              _nameController.text = data['displayName'] ?? data['name'] ?? user.displayName ?? '';
              _phoneController.text = data['phoneNumber'] ?? data['phone'] ?? '';
              _dobController.text = data['dob'] ?? '';
              _addressController.text = data['address'] ?? '';
              _selectedGender = data['gender'];
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // --- AVATAR SECTION ---
                Center(
                    child: Stack(
                        children: [
                            Container(
                                width: 110,
                                height: 110,
                                decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AppColors.primary.withOpacity(0.5), width: 3),
                                    image: user.photoURL != null 
                                       ? DecorationImage(image: NetworkImage(user.photoURL!), fit: BoxFit.cover) 
                                       : null,
                                    color: AppColors.bgCardDark
                                ),
                                child: user.photoURL == null 
                                    ? const Icon(LineIcons.user, size: 50, color: AppColors.textMuted) 
                                    : null,
                            ),
                            if (isEditing)
                            Positioned(
                                bottom: 0,
                                right: 0,
                                child: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: const BoxDecoration(
                                        color: AppColors.primary,
                                        shape: BoxShape.circle
                                    ),
                                    child: const Icon(LineIcons.camera, color: Colors.white, size: 16),
                                ),
                            )
                        ],
                    )
                ),
                const SizedBox(height: 10),
                Text(
                    user.displayName ?? 'Guest User', 
                    style: TextStyle(
                        fontSize: 22, 
                        fontWeight: FontWeight.bold, 
                        color: isDark ? Colors.white : Colors.black
                    )
                ),
                Text(
                    user.email ?? '', 
                    style: const TextStyle(fontSize: 14, color: AppColors.textMuted)
                ),

                const SizedBox(height: 30),
                
                // --- FIELDS ---
                _buildSectionTitle("Basic Information"),
                const SizedBox(height: 15),
                _buildModernField(
                    label: "Full Name", 
                    value: data['displayName'] ?? user.displayName ?? 'N/A', 
                    icon: LineIcons.user, 
                    controller: _nameController, 
                    isEditing: isEditing
                ),
                _buildDropdownOrText(
                    label: "Gender", 
                    value: _selectedGender ?? data['gender'] ?? 'Not Specified', 
                    icon: LineIcons.venusMars, 
                    isEditing: isEditing
                ),
                _buildDateOrText(
                    label: "Date of Birth", 
                    value: _dobController.text.isNotEmpty ? _dobController.text : (data['dob'] ?? 'Not Specified'), 
                    icon: LineIcons.calendar, 
                    isEditing: isEditing
                ),

                const SizedBox(height: 25),
                _buildSectionTitle("Contact Details"),
                const SizedBox(height: 15),
                
                // Read Only Email
                 _buildModernField(
                    label: "Email", 
                    value: user.email ?? 'N/A', 
                    icon: LineIcons.envelope, 
                    controller: null, // Null means read-only
                    isEditing: false
                ),
                _buildModernField(
                    label: "Phone Number", 
                    value: data['phoneNumber'] ?? data['phone'] ?? 'N/A', 
                    icon: LineIcons.phone, 
                    controller: _phoneController, 
                    isEditing: isEditing,
                    isPhone: true
                ),
                _buildModernField(
                    label: "Address", 
                    value: data['address'] ?? 'Not Specified', 
                    icon: LineIcons.mapMarker, 
                    controller: _addressController, 
                    isEditing: isEditing,
                    maxLines: 3
                ),
                
                const SizedBox(height: 40),

                if (isEditing)
                Row(
                    children: [
                        Expanded(
                            child: OutlinedButton(
                                onPressed: () => setState(() => isEditing = false),
                                style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    side: const BorderSide(color: AppColors.textMuted),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                                ),
                                child: const Text("Cancel", style: TextStyle(color: AppColors.textMuted)),
                            )
                        ),
                        const SizedBox(width: 15),
                        Expanded(
                            child: ElevatedButton(
                                onPressed: isLoading ? null : _saveProfile,
                                style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    elevation: 5,
                                    shadowColor: AppColors.primary.withOpacity(0.4)
                                ),
                                child: isLoading 
                                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                                    : const Text("Save Changes", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            )
                        ),
                    ],
                ),
                const SizedBox(height: 30),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
      return Align(
          alignment: Alignment.centerLeft,
          child: Text(
              title.toUpperCase(), 
              style: const TextStyle(
                  color: AppColors.primary, 
                  fontWeight: FontWeight.bold, 
                  fontSize: 12,
                  letterSpacing: 1.2
              )
          )
      );
  }

  Widget _buildModernField({
      required String label, 
      required String value, 
      required IconData icon, 
      TextEditingController? controller, 
      required bool isEditing, 
      bool isPhone = false, 
      int maxLines = 1
  }) {
      final isDark = Theme.of(context).brightness == Brightness.dark;
      final isReadOnly = !isEditing || controller == null;

      if (isReadOnly) {
          return Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              decoration: BoxDecoration(
                  color: isDark ? AppColors.bgCardDark.withOpacity(0.5) : AppColors.bgLight,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? Colors.transparent : AppColors.borderLight.withOpacity(0.5))
              ),
              child: Row(
                  children: [
                      Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.1),
                              shape: BoxShape.circle
                          ),
                          child: Icon(icon, color: AppColors.primary, size: 20),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                  Text(label, style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 12)),
                                  const SizedBox(height: 4),
                                  Text(value, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
                              ],
                          )
                      )
                  ],
              ),
          );
      }

      return Container(
          margin: const EdgeInsets.only(bottom: 16),
          child: TextFormField(
              controller: controller,
              maxLines: maxLines,
              keyboardType: isPhone ? TextInputType.phone : TextInputType.text,
              style: TextStyle(fontWeight: FontWeight.w600, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
              decoration: InputDecoration(
                  labelText: label,
                  labelStyle: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                  prefixIcon: Icon(icon, color: AppColors.primary),
                  filled: true,
                  fillColor: isDark ? AppColors.bgCardDark : AppColors.bgLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight, width: 1)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16)
              ),
          ),
      );
  }

  Widget _buildDropdownOrText({required String label, required String value, required IconData icon, required bool isEditing}) {
      final isDark = Theme.of(context).brightness == Brightness.dark;
      if (!isEditing) {
          return _buildModernField(label: label, value: value, icon: icon, isEditing: false, controller: null);
      }
      return Container(
          margin: const EdgeInsets.only(bottom: 16),
          child: DropdownButtonFormField<String>(
              value: _selectedGender,
              dropdownColor: isDark ? AppColors.bgCardDark : AppColors.bgLight,
              items: _genders.map((g) => DropdownMenuItem(child: Text(g, style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight)), value: g)).toList(),
              onChanged: (val) => setState(() => _selectedGender = val),
              decoration: InputDecoration(
                  labelText: label,
                  labelStyle: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                  prefixIcon: Icon(icon, color: AppColors.primary),
                  filled: true,
                  fillColor: isDark ? AppColors.bgCardDark : AppColors.bgLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight, width: 1)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.primary)),
              ),
          ),
      );
  }

  Widget _buildDateOrText({required String label, required String value, required IconData icon, required bool isEditing}) {
       final isDark = Theme.of(context).brightness == Brightness.dark;
       if (!isEditing) {
          return _buildModernField(label: label, value: value, icon: icon, isEditing: false, controller: null);
      }
      return Container(
          margin: const EdgeInsets.only(bottom: 16),
          child: TextFormField(
              controller: _dobController,
              readOnly: true,
              style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight, fontWeight: FontWeight.bold),
              onTap: () async {
                  DateTime? picked = await showDatePicker(
                      context: context, 
                      initialDate: DateTime.now(), 
                      firstDate: DateTime(1900), 
                      lastDate: DateTime.now()
                  );
                  if (picked != null) {
                      _dobController.text = DateFormat('yyyy-MM-dd').format(picked);
                  }
              },
              decoration: InputDecoration(
                  labelText: label,
                  labelStyle: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                  prefixIcon: Icon(icon, color: AppColors.primary),
                  filled: true,
                  fillColor: isDark ? AppColors.bgCardDark : AppColors.bgLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight, width: 1)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.primary)),
                  suffixIcon: Icon(LineIcons.calendarAlt, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)
              ),
          ),
      );
  }
}

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  bool pushEnabled = true;
  bool emailEnabled = true;
  bool smsEnabled = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        title: Text('Notification Settings', style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight)), 
        centerTitle: true, 
        elevation: 0,
        leading: IconButton(
          icon: Icon(LineIcons.angleLeft, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _buildSwitchTile(context, 'Push Notifications', 'Receive alerts for booking updates', pushEnabled, (v) => setState(() => pushEnabled = v)),
          _buildSwitchTile(context, 'Email Notifications', 'Daily updates and newsletters', emailEnabled, (v) => setState(() => emailEnabled = v)),
          _buildSwitchTile(context, 'SMS Notifications', 'Receive SMS for urgent matters', smsEnabled, (v) => setState(() => smsEnabled = v)),
        ],
      ),
    );
  }

  Widget _buildSwitchTile(BuildContext context, String title, String subtitle, bool value, Function(bool) onChanged) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.bgCardDark : Colors.white, 
        borderRadius: BorderRadius.circular(20), 
        border: Border.all(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5)),
        boxShadow: [
          if (!isDark) BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: SwitchListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? AppColors.textMainDark : const Color(0xFF1F2937))),
        subtitle: Text(subtitle, style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 13)),
        value: value,
        onChanged: onChanged,
        activeColor: AppColors.primary,
        inactiveTrackColor: isDark ? Colors.white10 : Colors.black12,
      ),
    );
  }
}

class SecurityPage extends StatefulWidget {
  const SecurityPage({super.key});

  @override
  State<SecurityPage> createState() => _SecurityPageState();
}

class _SecurityPageState extends State<SecurityPage> {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        title: Text('Login & Security', style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight)), 
        centerTitle: true, 
        elevation: 0,
        leading: IconButton(
          icon: Icon(LineIcons.angleLeft, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _buildActionTile(context, LineIcons.key, 'Change Password', 'Update your password regularly', _showChangePasswordDialog),
          _buildActionTile(context, LineIcons.fingerprint, 'Biometric Login', 'Use Fingerprint / FaceID', () {}),
        ],
      ),
    );
  }

  Widget _buildActionTile(BuildContext context, IconData icon, String title, String subtitle, VoidCallback onTap) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.bgCardDark : Colors.white, 
        borderRadius: BorderRadius.circular(20), 
        border: Border.all(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5)),
        boxShadow: [
          if (!isDark) BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? AppColors.primary.withOpacity(0.1) : const Color(0xFFE0F2F1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppColors.primary, size: 24),
        ),
        title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? AppColors.textMainDark : const Color(0xFF1F2937))),
        subtitle: Text(subtitle, style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 13)),
        trailing: Icon(LineIcons.angleRight, size: 18, color: isDark ? AppColors.textMutedDark : const Color(0xFF94A3B8)),
        onTap: onTap,
      ),
    );
  }

  void _showChangePasswordDialog() {
      final currentController = TextEditingController();
      final newController = TextEditingController();
      final confirmController = TextEditingController();

      showDialog(
          context: context,
          builder: (context) {
              return StatefulBuilder(
                  builder: (context, setState) {
                      bool isLoading = false;
                      return AlertDialog(
                          title: const Text('Change Password'),
                          content: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                  TextField(controller: currentController, decoration: const InputDecoration(labelText: 'Current Password'), obscureText: true),
                                  const SizedBox(height: 10),
                                  TextField(controller: newController, decoration: const InputDecoration(labelText: 'New Password'), obscureText: true),
                                  const SizedBox(height: 10),
                                  TextField(controller: confirmController, decoration: const InputDecoration(labelText: 'Confirm Password'), obscureText: true),
                              ]
                          ),
                          actions: [
                              TextButton(child: const Text('Cancel'), onPressed: () => Navigator.pop(context)),
                              ElevatedButton(
                                  child: isLoading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Update'),
                                  onPressed: isLoading ? null : () async {
                                      if (newController.text.isEmpty || confirmController.text.isEmpty) {
                                         // Show toast or snackbar
                                         return;
                                      }
                                      if (newController.text != confirmController.text) {
                                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Passwords do not match')));
                                          return;
                                      }
                                      
                                      setState(() => isLoading = true);
                                      try {
                                          final user = FirebaseAuth.instance.currentUser;
                                          if (user != null && user.email != null) {
                                              final cred = EmailAuthProvider.credential(email: user.email!, password: currentController.text);
                                              // Re-auth
                                              await user.reauthenticateWithCredential(cred);
                                              // Update
                                              await user.updatePassword(newController.text);
                                              
                                              if (mounted) {
                                                  Navigator.pop(context); // Close Dialog
                                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password updated successfully')));
                                              }
                                          }
                                      } catch (e) {
                                          // Keep dialog open on error
                                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                                      } finally {
                                          if (mounted) setState(() => isLoading = false);
                                      }
                                  }
                              )
                          ]
                      );
                  }
              );
          }
      );
  }
}

class LanguagePage extends StatefulWidget {
  const LanguagePage({super.key});

  @override
  State<LanguagePage> createState() => _LanguagePageState();
}

class _LanguagePageState extends State<LanguagePage> {
  String selectedLanguage = 'English';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        title: Text('Language', style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight)), 
        centerTitle: true, 
        elevation: 0,
        leading: IconButton(
          icon: Icon(LineIcons.angleLeft, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _buildLangItem(context, 'English'),
          _buildLangItem(context, 'Telugu'),
          _buildLangItem(context, 'Hindi'),
          _buildLangItem(context, 'Spanish'),
          _buildLangItem(context, 'French'),
        ],
      ),
    );
  }

  Widget _buildLangItem(BuildContext context, String lang) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    bool isSelected = selectedLanguage == lang;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.primary.withOpacity(0.1) : (isDark ? AppColors.bgCardDark : Colors.white),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: isSelected ? AppColors.primary : (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5)),
        boxShadow: [
          if (!isDark && !isSelected) BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: ListTile(
        title: Text(lang, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
        trailing: isSelected ? const Icon(Icons.check_circle, color: AppColors.primary) : null,
        onTap: () => setState(() => selectedLanguage = lang),
      ),
    );
  }
}

class AppearancePage extends StatefulWidget {
  const AppearancePage({super.key});

  @override
  State<AppearancePage> createState() => _AppearancePageState();
}

class _AppearancePageState extends State<AppearancePage> {
  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        title: Text('Appearance', style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight)), 
        centerTitle: true, 
        elevation: 0,
        leading: IconButton(
          icon: Icon(LineIcons.angleLeft, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _buildThemeItem(context, 'System Default', 'Match device settings', ThemeMode.system),
          _buildThemeItem(context, 'Light', 'Always bright and clear', ThemeMode.light),
          _buildThemeItem(context, 'Dark', 'Perfect for night and OLED screens', ThemeMode.dark),
        ],
      ),
    );
  }

  Widget _buildThemeItem(BuildContext context, String title, String subtitle, ThemeMode mode) {
    final state = Provider.of<AppState>(context, listen: false);
    bool isSelected = state.themeMode == mode;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.primary.withOpacity(0.1) : (isDark ? AppColors.bgCardDark : Colors.white),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: isSelected ? AppColors.primary : (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5)),
        boxShadow: [
          if (!isDark && !isSelected) BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: ListTile(
        title: Text(title, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
        subtitle: Text(subtitle, style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 12)),
        trailing: isSelected ? const Icon(Icons.check_circle, color: AppColors.primary) : null,
        onTap: () => state.setThemeMode(mode),
      ),
    );
  }
}

// --- ABOUT US PAGE ---
class AboutUsPage extends StatelessWidget {
  const AboutUsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        title: Text('About Us', style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight)), 
        centerTitle: true, 
        elevation: 0,
        leading: IconButton(
          icon: Icon(LineIcons.angleLeft, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? AppColors.bgCardDark : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5)),
              ),
              child: Column(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(LineIcons.hotel, color: Colors.white, size: 40),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'StayZen v1.0.0',
                    style: GoogleFonts.outfit(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.textMainDark : AppColors.textMainLight,
                    ),
                  ),
                  const SizedBox(height: 30),
                  Text(
                    'Welcome to StayZen, your premier destination for finding the perfect stay. Whether you are looking for a modern apartment, a comfortable PG, or a luxurious villa, we are here to help you find a place that truly fits your life.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 15,
                      height: 1.6,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Our Mission',
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.textMainDark : AppColors.textMainLight,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'To simplify the search for living spaces by providing a transparent, user-friendly, and comprehensive platform that connects seekers with their ideal homes.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 15,
                      height: 1.6,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                  const SizedBox(height: 30),
                  Divider(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                  const SizedBox(height: 20),
                  Text(
                    'Thank you for choosing StayZen!',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// --- HELP CENTER PAGE ---
class HelpCenterPage extends StatefulWidget {
  const HelpCenterPage({super.key});

  @override
  State<HelpCenterPage> createState() => _HelpCenterPageState();
}

class _HelpCenterPageState extends State<HelpCenterPage> {
  String _whatsappNumber = '';
  String _countryCode = '91';
  bool _isLoadingContact = true;

  @override
  void initState() {
    super.initState();
    _fetchContactDetails();
  }

  Future<void> _fetchContactDetails() async {
    try {
      final docSnap = await FirebaseFirestore.instance.collection('settings').doc('support').get();
      if (docSnap.exists) {
        final data = docSnap.data()!;
        if (mounted) {
          setState(() {
            _whatsappNumber = data['whatsappNumber'] ?? '';
            _countryCode = data['countryCode'] ?? '91';
            _isLoadingContact = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoadingContact = false);
      }
    } catch (e) {
      debugPrint('Error fetching contact details: $e');
      if (mounted) setState(() => _isLoadingContact = false);
    }
  }

  Future<void> _launchWhatsApp({String? specificQuestion}) async {
    if (_whatsappNumber.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Support number not configured by admin.'), backgroundColor: Colors.orange));
      return;
    }

    final fullNumber = '$_countryCode$_whatsappNumber';
    String message = 'Hi StayZen Support, I need help.';
    if (specificQuestion != null) {
      message = 'Hi StayZen Support, I have a question: $specificQuestion';
    }

    final url = "whatsapp://send?phone=$fullNumber&text=${Uri.encodeComponent(message)}";
    final webUrl = "https://wa.me/$fullNumber?text=${Uri.encodeComponent(message)}";

    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url));
    } else {
      await launchUrl(Uri.parse(webUrl), mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        title: Text('Help Center', style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight)), 
        centerTitle: true, 
        elevation: 0,
        leading: IconButton(
          icon: Icon(LineIcons.angleLeft, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text('Frequently Asked Questions', style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
            ),
          ),
          StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance.collection('faqs').orderBy('createdAt', descending: true).snapshots(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const SliverToBoxAdapter(child: Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator())));
              }
              if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                return SliverToBoxAdapter(
                  child: Column(
                    children: [
                      _faqItem(context, 'How do I book a stay?', 'Search for a property, click view details and follow the prompts.'),
                      _faqItem(context, 'Is there a security deposit?', 'Yes, it varies by property and is listed in the details.'),
                    ],
                  ),
                );
              }

              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final data = snapshot.data!.docs[index].data() as Map<String, dynamic>;
                    final q = data['question'] ?? 'No question';
                    final a = data['answer'] ?? 'Check with support for details.';
                    return _faqItem(context, q, a);
                  },
                  childCount: snapshot.data!.docs.length,
                ),
              );
            },
          ),
          SliverFillRemaining(
            hasScrollBody: false,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                   Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.08), 
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: AppColors.primary.withOpacity(0.1)),
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), shape: BoxShape.circle),
                          child: const Icon(LineIcons.phone, size: 30, color: AppColors.primary),
                        ),
                        const SizedBox(height: 16),
                        Text('Still need help?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
                        const SizedBox(height: 4),
                        Text('Our support team is available via WhatsApp', style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 13)),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: ElevatedButton(
                            onPressed: _isLoadingContact ? null : () => _launchWhatsApp(),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary, 
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                              elevation: 0,
                            ),
                            child: _isLoadingContact 
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.message, color: Colors.white, size: 18),
                                    SizedBox(width: 8),
                                    Text('Chat on WhatsApp', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                          ),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _faqItem(BuildContext context, String q, String a) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.bgCardDark : AppColors.bgCardLight,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: ExpansionTile(
        title: Text(q, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16), 
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(a, style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 13, height: 1.5)),
                const SizedBox(height: 10),
                TextButton(
                  onPressed: () => _launchWhatsApp(specificQuestion: q),
                  child: const Text('Ask support about this', style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold)),
                )
              ],
            )
          )
        ],
        shape: const Border(),
        iconColor: AppColors.primary,
        collapsedIconColor: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
      ),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  // Navigation States
  bool isLogin = true;
  bool isForgotPassword = false;
  
  // Registration States
  bool isOtpSent = false;
  bool isOtpVerified = false;
  
  // Controllers
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();

  bool isLoading = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: Stack(
        children: [
          // Decorative Background Objects
          Positioned(
            top: -size.width * 0.2,
            right: -size.width * 0.2,
            child: _buildBlurCircle(size.width * 0.8, AppColors.primary.withOpacity(0.12)),
          ),
          Positioned(
            bottom: -size.width * 0.2,
            left: -size.width * 0.3,
            child: _buildBlurCircle(size.width * 0.9, AppColors.primary.withOpacity(0.08)),
          ),
          
          SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  const SizedBox(height: 40),
                  _buildTopBrand(),
                  const SizedBox(height: 50),
                  
                  // Main Form Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.bgCardDark.withOpacity(0.9) : Colors.white.withOpacity(0.92),
                      borderRadius: BorderRadius.circular(32),
                      border: Border.all(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
                          blurRadius: 30,
                          offset: const Offset(0, 15),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getFormTitle(),
                          style: GoogleFonts.outfit(
                            fontSize: 28, 
                            fontWeight: FontWeight.w800, 
                            color: isDark ? AppColors.textMainDark : AppColors.textMainLight,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _getFormSubtitle(),
                          style: TextStyle(
                            color: (isDark ? AppColors.textMutedDark : AppColors.textMutedLight).withOpacity(0.7), 
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 32),
                        
                        // Internal Forms
                        if (isForgotPassword) _buildForgotPasswordForm()
                        else if (isLogin) _buildLoginForm()
                        else _buildRegisterForm(),
                        
                        const SizedBox(height: 12),
                        _buildMainButton(),
                        const SizedBox(height: 24),
                        if (!isForgotPassword) _buildPageSwitcher(),
                      ],
                    ),
                  ),

                  if (!isForgotPassword && !isOtpSent) ...[
                      const SizedBox(height: 40),
                      _buildSocialSection(isDark),
                  ],

                  const SizedBox(height: 40),
                  
                  if (isForgotPassword)
                    TextButton.icon(
                      onPressed: () => setState(() => isForgotPassword = false),
                      icon: const Icon(LineIcons.arrowLeft, size: 16),
                      label: const Text('Back to login', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildBlurCircle(double size, Color color) {
      return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color,
              boxShadow: [
                  BoxShadow(color: color, blurRadius: 100, spreadRadius: 50)
              ]
          ),
      );
  }

  Widget _buildSocialSection(bool isDark) {
      return Column(
          children: [
              Row(
                  children: [
                      Expanded(child: Divider(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.3))),
                      Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text("Or continue with", style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 12)),
                      ),
                      Expanded(child: Divider(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.3))),
                  ],
              ),
              const SizedBox(height: 24),
              Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                      _socialIconButton(LineIcons.googleLogo, isDark),
                      const SizedBox(width: 20),
                      _socialIconButton(LineIcons.apple, isDark),
                  ],
              )
          ],
      );
  }

  Widget _socialIconButton(IconData icon, bool isDark) {
      return Container(
          width: 70,
          height: 60,
          decoration: BoxDecoration(
              color: isDark ? AppColors.bgCardDark : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5))
          ),
          child: Icon(icon, size: 28, color: isDark ? AppColors.textMainDark : AppColors.textMainLight),
      );
  }

  Widget _buildTopBrand() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.primary, 
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
                BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 8))
            ]
          ),
          child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Image.asset(
            'assets/images/app_icon.png', 
            width: 45, 
            height: 45, 
            fit: BoxFit.contain,
          ),
        ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Stay', style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.bold, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
            Text('Zen', style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.primary)),
          ],
        ),
      ],
    );
  }

  String _getFormTitle() {
    if (isForgotPassword) return "Reset Password";
    if (isLogin) return "Welcome Back";
    if (isOtpVerified) return "Final Steps";
    if (isOtpSent) return "Verify OTP";
    return "Create Account";
  }

  String _getFormSubtitle() {
    if (isForgotPassword) return "Enter your Gmail to receive a reset link";
    if (isLogin) return "Sign in to continue your journey";
    if (isOtpVerified) return "Almost there! Just a few more details";
    if (isOtpSent) return "Enter the code sent to your mobile";
    return "Join the most premium stay community";
  }

  Widget _buildLoginForm() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        _buildInputField(context, Icons.mail_outline, "Email Address", _emailController, TextInputType.emailAddress),
        const SizedBox(height: 16),
        _buildInputField(context, Icons.lock_outline, "Password", _passwordController, TextInputType.text, isPassword: true),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => setState(() => isForgotPassword = true),
            child: Text('Forgot Password?', style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 13)),
          ),
        ),
      ],
    );
  }

  Widget _buildForgotPasswordForm() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        _buildInputField(context, Icons.mail_outline, "Gmail Address", _emailController, TextInputType.emailAddress),
        const SizedBox(height: 10),
        Text(
          "We will send a secure reset link to your email.",
          style: TextStyle(color: (isDark ? AppColors.textMutedDark : AppColors.textMutedLight).withOpacity(0.6), fontSize: 12),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildRegisterForm() {
    return Column(
      children: [
        // Fields visible only when OTP is NOT verified
        if (!isOtpVerified) ...[
          _buildInputField(context, Icons.person_outline, "Full Name", _nameController, TextInputType.name, isReadOnly: isOtpSent),
          const SizedBox(height: 16),
          _buildInputField(context, Icons.phone_android, "Mobile Number", _phoneController, TextInputType.phone, isReadOnly: isOtpSent),
        ],
        
        // Show OTP field after it's sent
        if (isOtpSent && !isOtpVerified) ...[
          const SizedBox(height: 16),
          _buildInputField(context, Icons.sms_outlined, "Enter OTP (123456)", _otpController, TextInputType.number),
          Text(
            "Didn't get it? Use 123456 for testing.",
            style: TextStyle(color: Colors.grey.withOpacity(0.7), fontSize: 12),
          ),
          const SizedBox(height: 10),
        ],
        
        // Final registration fields
        if (isOtpVerified) ...[
          _buildInputField(context, Icons.verified_user, "Mobile Verified", _phoneController, TextInputType.phone, isReadOnly: true),
          const SizedBox(height: 16),
          _buildInputField(context, Icons.mail_outline, "Email Address", _emailController, TextInputType.emailAddress),
          const SizedBox(height: 16),
          _buildInputField(context, Icons.lock_outline, "Create Password", _passwordController, TextInputType.text, isPassword: true),
          const SizedBox(height: 16),
          _buildInputField(context, Icons.lock_reset, "Confirm Password", _confirmPasswordController, TextInputType.text, isPassword: true),
        ],
      ],
    );
  }

  Widget _buildInputField(BuildContext context, IconData icon, String label, TextEditingController controller, TextInputType type, {bool isPassword = false, bool isReadOnly = false}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.bgDark.withOpacity(0.5) : AppColors.bgLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.3)),
      ),
      child: TextField(
        controller: controller,
        keyboardType: type,
        obscureText: isPassword,
        readOnly: isReadOnly,
        style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight, fontSize: 15, fontWeight: FontWeight.w500),
        decoration: InputDecoration(
          prefixIcon: Icon(icon, color: AppColors.primary.withOpacity(0.8), size: 20),
          labelText: label,
          labelStyle: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 13),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      ),
    );
  }

  Widget _buildMainButton() {
    String text = "Sign In";
    if (isForgotPassword) text = "Send Link";
    else if (!isLogin) {
      if (isOtpVerified) text = "Complete Registration";
      else if (isOtpSent) text = "Verify & Continue";
      else text = "Get OTP";
    }

    return Container(
      width: double.infinity,
      height: 60,
      decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
              BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 8))
          ]
      ),
      child: ElevatedButton(
        onPressed: isLoading ? null : _handlePrimaryAction,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: isLoading 
          ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
          : Text(text, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 0.5)),
      ),
    );
  }

  Widget _buildPageSwitcher() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          isLogin ? "New here? " : "Joined already? ", 
          style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 14)
        ),
        GestureDetector(
          onTap: () {
            setState(() {
              isLogin = !isLogin;
              isOtpSent = false;
              isOtpVerified = false;
            });
          },
          child: Text(
            isLogin ? "Sign Up" : "Log In",
            style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 14),
          ),
        ),
      ],
    );
  }

  void _handlePrimaryAction() async {
    if (isForgotPassword) {
      _sendForgotPasswordOtp();
      return;
    }

    if (isLogin) {
      _login();
      return;
    }

    // Registration phases
    if (!isOtpSent) {
      _sendRegistrationOtp();
    } else if (!isOtpVerified) {
      _verifyRegistrationOtp();
    } else {
      _finalRegister();
    }
  }

  void _login() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      _showError("Please enter all details");
      return;
    }
    setState(() => isLoading = true);
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text.trim(),
      );
    } catch (e) {
      _showError(e.toString());
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  void _sendForgotPasswordOtp() async {
    if (_emailController.text.isEmpty) {
      _showError("Please enter your registered email");
      return;
    }
    setState(() => isLoading = true);
    try {
      await FirebaseAuth.instance.sendPasswordResetEmail(email: _emailController.text.trim());
      _showSuccess("Reset link sent to ${_emailController.text}");
      setState(() => isForgotPassword = false);
    } catch (e) {
      _showError(e.toString());
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  void _sendRegistrationOtp() async {
    if (_nameController.text.isEmpty || _phoneController.text.isEmpty) {
      _showError("Name and Phone are required");
      return;
    }
    setState(() => isLoading = true);
    try {
      final success = await Msg91Service.sendOtp(_phoneController.text);
      if (success) {
        setState(() => isOtpSent = true);
        _showSuccess("Code sent to ${_phoneController.text}");
      }
    } catch (e) {
      _showError(e.toString());
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  void _verifyRegistrationOtp() async {
    if (_otpController.text.isEmpty) {
      _showError("Enter the OTP");
      return;
    }
    
    // Bypass for testing
    if (_otpController.text == "123456") {
      setState(() => isOtpVerified = true);
      _showSuccess("Logged in via test code!");
      return;
    }

    setState(() => isLoading = true);
    try {
      final success = await Msg91Service.verifyOtp(_phoneController.text, _otpController.text);
      if (success) {
        setState(() => isOtpVerified = true);
        _showSuccess("Mobile number verified!");
      }
    } catch (e) {
      _showError(e.toString());
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  void _finalRegister() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      _showError("Complete all fields");
      return;
    }
    if (_passwordController.text != _confirmPasswordController.text) {
      _showError("Passwords do not match");
      return;
    }
    
    setState(() => isLoading = true);
    try {
      final cred = await FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text.trim(),
      );
      
      await cred.user?.updateDisplayName(_nameController.text.trim());
      
      // Save data to Firestore
      await FirebaseFirestore.instance.collection('users').doc(cred.user?.uid).set({
        'fullName': _nameController.text.trim(),
        'phoneNumber': _phoneController.text.trim(),
        'email': _emailController.text.trim(),
        'createdAt': FieldValue.serverTimestamp(),
        'verified': true,
      });

      if (mounted) {
        _showSuccess("Account created successfully. Please login.");
        setState(() {
          isLogin = true;
          isOtpSent = false;
          isOtpVerified = false;
        });
      }
    } catch (e) {
      _showError(e.toString());
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.redAccent));
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppColors.primary));
  }
}

// --- PROPERTY CARD ---
class PropertyCard extends StatelessWidget {
  final String id;
  final String name;
  final String location;
  final String price;
  final String image;
  final String type;
  final String? unitType;
  final String? roomType;
  final Map<String, dynamic> fullData;

  const PropertyCard({
    super.key,
    required this.id,
    required this.name,
    required this.location,
    required this.price,
    required this.image,
    required this.type,
    this.unitType,
    this.roomType,
    required this.fullData,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => PropertyDetailsPage(propertyId: id, data: fullData))),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: isDark ? AppColors.bgCardDark : AppColors.bgLight,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                  child: commonBuildImage(image, height: 230, width: double.infinity, fit: BoxFit.cover),
                ),
                Positioned(
                  top: 15,
                  left: 15,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                    child: const Row(
                      children: [
                        Icon(Icons.star, size: 10, color: Color(0xFFFFB800)),
                        SizedBox(width: 4),
                        Text('4.8', style: TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  bottom: 15,
                  left: 15,
                  child: Builder(builder: (context) {
                    // Show the PG sub-type (GIRLS PG, BOYS PG) on the image badge
                    String? subText;
                    final separators = ['•', '·', '-', '|'];
                    for (var sep in separators) {
                      if (type.contains(sep)) {
                        subText = type.split(sep).last.trim();
                        break;
                      }
                    }
                    
                    if (subText == null || subText.toLowerCase() == 'not specified') return const SizedBox.shrink();
                    
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.7),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Text(
                        subText.toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    );
                  }),
                ),
                Positioned(
                  top: 15,
                  right: 15,
                  child: StreamBuilder<QuerySnapshot>(
                    stream: FirebaseFirestore.instance
                        .collection('favorites')
                        .where('userId', isEqualTo: FirebaseAuth.instance.currentUser?.uid)
                        .where('propertyId', isEqualTo: id)
                        .limit(1)
                        .snapshots(),
                    builder: (context, snapshot) {
                      final isFavorite = snapshot.hasData && snapshot.data!.docs.isNotEmpty;
                      return GestureDetector(
                        onTap: () async {
                          final user = FirebaseAuth.instance.currentUser;
                          if (user == null) return;
                          
                          if (isFavorite) {
                            // Remove from favorites
                            final docId = snapshot.data!.docs.first.id;
                            await FirebaseFirestore.instance.collection('favorites').doc(docId).delete();
                          } else {
                            // Add to favorites
                            await FirebaseFirestore.instance.collection('favorites').add({
                              'userId': user.uid,
                              'propertyId': id,
                              'propertyName': name,
                              'propertyLocation': location,
                              'propertyPrice': price,
                              'propertyImage': image,
                              'propertyType': type,
                              'propertyData': fullData,
                              'createdAt': DateTime.now().toIso8601String(),
                            });
                          }
                        },
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                          child: Center(
                            child: Icon(
                              isFavorite ? Icons.favorite : Icons.favorite_border,
                              size: 16,
                              color: isFavorite ? Colors.red : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                )
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(15.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          () {
                            String main = type;
                            final separators = ['•', '·', '-', '|'];
                            for (var sep in separators) {
                              if (type.contains(sep)) {
                                main = type.split(sep)[0].trim();
                                break;
                              }
                            }
                            return main.toUpperCase();
                          }(), 
                          style: const TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.w800)
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(price, style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight, fontSize: 16, fontWeight: FontWeight.w800)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(name, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: isDark ? AppColors.textMainDark : AppColors.textMainLight), maxLines: 1),
                      ),
                      Builder(builder: (context) {
                        // Identify category strictly
                        bool isPG = type.toUpperCase().contains('PG') || type.toUpperCase().contains('PGS');
                        
                        String? config;
                        final rType = (roomType ?? '').toLowerCase();
                        final uType = (unitType ?? '').toLowerCase();
                        
                        if (isPG) {
                          // For PGs, ONLY show Sharing info
                          if (rType.contains('sharing')) config = roomType;
                          else if (uType.contains('sharing')) config = unitType;
                        } else {
                          // For Apartments, ONLY show BHK info
                          if (uType.contains('bhk')) config = unitType;
                          else if (rType.contains('bhk')) config = roomType;
                        }
                        
                        if (config == null || config.isEmpty) return const SizedBox.shrink();
                        
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1AA79C).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFF1AA79C).withOpacity(0.3)),
                          ),
                          child: Text(
                            config.toUpperCase(),
                            style: const TextStyle(color: Color(0xFF1AA79C), fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        );
                      }),
                    ],
                  ),
                  const SizedBox(height: 5),
                  InkWell(
                    onTap: () async {
                      final link = fullData['googleMapsLink'];
                      if (link != null && link.toString().isNotEmpty) {
                        await launchUrl(Uri.parse(link.toString()), mode: LaunchMode.externalApplication);
                      }
                    },
                    child: Row(
                      children: [
                        Icon(LineIcons.mapMarker, size: 12, color: AppColors.primary),
                        const SizedBox(width: 4),
                        Text(location, style: TextStyle(color: isDark ? AppColors.textMainDark : AppColors.textMainLight, fontSize: 12, decoration: TextDecoration.underline)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Divider(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          _Tag(text: 'Wifi'),
                          const SizedBox(width: 6),
                          _Tag(text: 'AC'),
                        ],
                      ),
                      Row(
                        children: [
                          InkWell(
                            onTap: () async {
                              final link = fullData['googleMapsLink'];
                              if (link != null && link.toString().isNotEmpty) {
                                await launchUrl(Uri.parse(link.toString()), mode: LaunchMode.externalApplication);
                              }
                            },
                            child: const Text('Location', style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold, decoration: TextDecoration.underline)),
                          ),
                          const SizedBox(width: 15),
                          const Text('View Details', style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold, decoration: TextDecoration.underline)),
                        ],
                      ),
                    ],
                  )
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}

// --- PROPERTY DETAILS PAGE ---
class PropertyDetailsPage extends StatefulWidget {
  final String propertyId;
  final Map<String, dynamic> data;
  const PropertyDetailsPage({super.key, required this.propertyId, required this.data});

  @override
  State<PropertyDetailsPage> createState() => _PropertyDetailsPageState();
}

class _PropertyDetailsPageState extends State<PropertyDetailsPage> {
  int _currentImageIndex = 0;

  Future<void> _makePhoneCall(String phoneNumber) async {
    final Uri launchUri = Uri(scheme: 'tel', path: phoneNumber);
    await launchUrl(launchUri);
  }

  Future<void> _sendEmail(String email) async {
    final Uri launchUri = Uri(scheme: 'mailto', path: email);
    await launchUrl(launchUri);
  }

  Future<void> _openMaps(String? link) async {
    if (link == null || link.isEmpty) return;
    final Uri url = Uri.parse(link);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      throw Exception('Could not launch $url');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final images = widget.data['imageUrls'] != null && (widget.data['imageUrls'] as List).isNotEmpty 
        ? widget.data['imageUrls'] as List 
        : ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'];

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 350,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  PageView.builder(
                    itemCount: images.length,
                    onPageChanged: (index) => setState(() => _currentImageIndex = index),
                    itemBuilder: (context, index) => commonBuildImage(images[index] as String),
                  ),
                  if (images.length > 1)
                    Positioned(
                      bottom: 20,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: images.asMap().entries.map((entry) {
                          return Container(
                            width: 8.0,
                            height: 8.0,
                            margin: const EdgeInsets.symmetric(horizontal: 4.0),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withOpacity(_currentImageIndex == entry.key ? 0.9 : 0.4),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                ],
              ),
            ),
            actions: [
              IconButton(icon: const Icon(Icons.favorite_border), onPressed: () {}),
              IconButton(icon: const Icon(Icons.share_outlined), onPressed: () {}),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          _Tag(text: (widget.data['propertyType'] ?? 'Stay').toUpperCase()),
                          if (widget.data['status'] == 'Booked') ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.green.withOpacity(0.5))),
                              child: const Row(
                                children: [
                                  Icon(Icons.verified, color: Colors.green, size: 14),
                                  SizedBox(width: 4),
                                  Text('CONFIRMED RENTER', style: TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 18),
                          const SizedBox(width: 4),
                          Text(widget.data['rating']?.toString() ?? '4.8', style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
                        ],
                      )
                    ],
                  ),
                  const SizedBox(height: 15),
                  Text(widget.data['propertyName'] ?? 'StayZen Stay', style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w800, color: isDark ? AppColors.textMainDark : AppColors.textMainLight)),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () => _openMaps(widget.data['googleMapsLink']),
                    child: Row(
                      children: [
                        const Icon(Icons.location_on_outlined, color: AppColors.primary, size: 16),
                        const SizedBox(width: 4),
                        Expanded(child: Text('${widget.data['colonyArea'] ?? ''}, ${widget.data['city'] ?? ''}, ${widget.data['state'] ?? ''} ${widget.data['pincode'] ?? ''}', style: const TextStyle(color: AppColors.textMuted))),
                      ],
                    ),
                  ),

                  const SizedBox(height: 25),
                  // Key Info Grid
                  Row(
                    children: [
                      Builder(builder: (context) {
                        final propertyType = widget.data['propertyType']?.toString() ?? '';
                        final subType = widget.data['unitType'] != null && widget.data['unitType'].toString().isNotEmpty
                            ? widget.data['unitType']
                            : (propertyType.contains('•') ? propertyType.split('•').last.trim() : '1 BHK');
                        return _InfoCard(label: 'Type', value: subType.toString(), icon: Icons.king_bed_outlined);
                      }),
                      const SizedBox(width: 12),
                      _InfoCard(label: 'Advance', value: widget.data['advancePayment'] ?? '₹500', icon: Icons.payments_outlined),
                      const SizedBox(width: 12),
                      _InfoCard(label: 'Units Left', value: '${widget.data['emptyUnits'] ?? '0'}/${widget.data['totalUnits'] ?? '0'}', icon: Icons.grid_view_outlined),
                    ],
                  ),

                  const SizedBox(height: 30),
                  const Text('Contact Information', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 15),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.bgCardDark : AppColors.bgCardLight,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), shape: BoxShape.circle),
                              child: const Icon(Icons.person_outline, color: AppColors.primary, size: 24),
                            ),
                            const SizedBox(width: 15),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(widget.data['managerName'] ?? 'Property Manager', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                const Text('Manager', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            Expanded(
                              child: _ContactAction(
                                icon: Icons.phone_outlined,
                                label: 'Call',
                                onTap: () => _makePhoneCall(widget.data['contactNumber'] ?? ''),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _ContactAction(
                                icon: Icons.location_on_outlined,
                                label: 'Map',
                                onTap: () => _openMaps(widget.data['googleMapsLink']),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _ContactAction(
                                icon: Icons.mail_outline,
                                label: 'Email',
                                onTap: () => _sendEmail(widget.data['email'] ?? ''),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 30),
                  const Text('Description', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  Text(
                    widget.data['postDetails'] ?? 'A premium stay experience with all modern amenities and comfort. Perfect for students and professionals looking for a peaceful environment.',
                    style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, height: 1.5),
                  ),
                  const SizedBox(height: 30),
                  const Text('Amenities', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 15),
                  Wrap(
                    spacing: 15,
                    runSpacing: 15,
                    children: [
                      if (widget.data['waterAvailability'] == 'Yes') _Amenity(icon: Icons.water_drop_outlined, text: '24/7 Water'),
                      if (widget.data['powerBackup'] == 'Yes') _Amenity(icon: Icons.battery_charging_full, text: 'Power Backup'),
                      if (widget.data['parkingSpace'] == 'Yes') _Amenity(icon: Icons.local_parking, text: 'Parking'),
                      if (widget.data['liftAvailable'] == 'Yes') _Amenity(icon: Icons.elevator_outlined, text: 'Lift'),
                      if (widget.data['cctvSecurity'] == 'Yes') _Amenity(icon: Icons.videocam_outlined, text: 'CCTV'),
                      _Amenity(icon: Icons.wifi, text: 'Free Wifi'),
                      _Amenity(icon: Icons.ac_unit, text: 'Air Conditioning'),
                    ],
                  ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          )
        ],
      ),
      bottomSheet: widget.data['status'] == 'Booked' 
        ? Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? AppColors.bgCardDark : AppColors.bgLight,
              border: Border(top: BorderSide(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5))),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_circle, color: AppColors.primary),
                SizedBox(width: 10),
                Text('You are a confirmed renter for this stay', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
              ],
            ),
          )
        : Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? AppColors.bgCardDark : Colors.white,
              border: Border(top: BorderSide(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.5))),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
              boxShadow: isDark ? [] : [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20, offset: const Offset(0, -5))],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Monthly Rent', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                      Text(widget.data['monthlyRent']?.toString().startsWith('₹') == true ? '${widget.data['monthlyRent']}/mo' : '₹${widget.data['monthlyRent'] ?? widget.data['price'] ?? '0'}/mo', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.primary)),
                      Builder(builder: (context) {
                        final propertyType = widget.data['propertyType']?.toString() ?? '';
                        final uType = widget.data['unitType']?.toString();
                        final rType = widget.data['roomType']?.toString();
                        bool isPG = propertyType.toUpperCase().contains('PGS') || propertyType.toUpperCase().contains('PG');
                        
                        List<String> items = [];
                        
                        if (isPG) {
                          if (rType != null && rType.isNotEmpty && rType.toLowerCase() != 'not specified') {
                            items.add(rType);
                          }
                        } else {
                          if (uType != null && uType.isNotEmpty && uType.toLowerCase() != 'not specified') {
                            items.add(uType);
                          }
                        }

                        if (items.isEmpty) return const SizedBox.shrink();
                        return Text(
                          items.join(' • ').toUpperCase(), 
                          style: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w800)
                        );
                      }),
                    ],
                  ),
                ),
                SizedBox(
                  width: 170,
                  height: 55,
                  child: StreamBuilder<QuerySnapshot>(
                    stream: FirebaseFirestore.instance
                        .collection('bookings')
                        .where('userId', isEqualTo: FirebaseAuth.instance.currentUser?.uid)
                        .where('propertyId', isEqualTo: widget.propertyId)
                        .snapshots(),
                    builder: (context, snapshot) {
                      bool isBooked = snapshot.hasData && snapshot.data!.docs.isNotEmpty;
                      
                      return ElevatedButton(
                        onPressed: isBooked ? null : () => _handleBooking(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isBooked ? Colors.grey.withOpacity(0.5) : AppColors.primary, 
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                          disabledBackgroundColor: Colors.grey.withOpacity(0.2)
                        ),
                        child: Text(
                          isBooked ? 'Booked' : 'Book Now', 
                          style: TextStyle(
                            color: isBooked ? AppColors.textMuted : Colors.white, 
                            fontWeight: FontWeight.bold
                          )
                        ),
                      );
                    }
                  ),
                )
              ],
            ),
          ),
    );
  }

  void _handleBooking(BuildContext context) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    
    try {
      // Fetch user profile for display name and phone if missing
      final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
      final userData = userDoc.data();

      await FirebaseFirestore.instance.collection('bookings').add({
        'userId': user.uid,
        'ownerId': widget.data['ownerId'], // CRITICAL: For manager dashboard sync
        'userName': userData?['name'] ?? user.displayName ?? 'Guest User',
        'userPhone': userData?['phone'] ?? user.phoneNumber ?? '',
        'email': user.email ?? '',
        'propertyId': widget.propertyId,
        'propertyName': widget.data['propertyName'],
        'propertyLocation': '${widget.data['colonyArea'] ?? ''}, ${widget.data['city'] ?? ''}',
        'propertyImage': (widget.data['imageUrls'] != null && (widget.data['imageUrls'] as List).isNotEmpty) ? (widget.data['imageUrls'] as List)[0] : '',
        'price': widget.data['monthlyRent']?.toString().startsWith('₹') == true ? '${widget.data['monthlyRent']}/mo' : '₹${widget.data['monthlyRent']}/mo',
        'monthlyRent': widget.data['monthlyRent']?.toString() ?? '8000', // Dashboard needs this
        'rent': widget.data['monthlyRent']?.toString() ?? '8000', // Alternative field name
        'advance': widget.data['advancePayment']?.toString().replaceAll(RegExp(r'[^0-9]'), '') ?? '500',
        'advanceAmount': widget.data['advancePayment']?.toString().startsWith('₹') == true ? widget.data['advancePayment'] : '₹${widget.data['advancePayment'] ?? '500'}',
        'status': 'Pending',
        'createdAt': FieldValue.serverTimestamp(),
        'moveInDate': DateFormat('yyyy-MM-dd').format(DateTime.now().add(const Duration(days: 7))),
      });

      // 🔔 Notify Manager
      if (widget.data['ownerId'] != null) {
        await FirebaseFirestore.instance.collection('notifications').add({
          'type': 'NEW_BOOKING',
          'title': 'New Booking Request',
          'message': '${userData?['name'] ?? user.displayName ?? 'Guest'} requested a booking for ${widget.data['propertyName']}',
          'targetId': widget.data['ownerId'],
          'status': 'unread',
          'createdAt': DateTime.now().toIso8601String(),
        });
      }
      
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Booking Requested! Go to Bookings to pay advance.')));
        Navigator.pop(context);
        Provider.of<AppState>(context, listen: false).setIndex(1); // Switch to bookings tab
      }
    } catch (e) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }
}

class _Amenity extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Amenity({required this.icon, required this.text});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: (MediaQuery.of(context).size.width - 70) / 2,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark ? AppColors.bgCardDark : AppColors.bgLight,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Theme.of(context).brightness == Brightness.dark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.primary, size: 20),
          const SizedBox(width: 10),
          Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

// --- POST PROPERTY PAGE ---
class PostPropertyPage extends StatefulWidget {
  const PostPropertyPage({super.key});
  @override
  State<PostPropertyPage> createState() => _PostPropertyPageState();
}

class _PostPropertyPageState extends State<PostPropertyPage> {
  final _nameController = TextEditingController();
  final _locController = TextEditingController();
  final _rentController = TextEditingController();
  final _descController = TextEditingController();
  final _unitTypeController = TextEditingController();
   final _mapsController = TextEditingController();
  String _type = 'Apartment';
  String _pgRoomType = '2x Sharing';
  String _pgGender = 'Girls PG';
  String _apartmentType = '2BHK';
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Post Property'), centerTitle: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _buildField('Property Name', _nameController, Icons.home_outlined),
            const SizedBox(height: 20),
            _buildField('Location (City, Area)', _locController, Icons.location_on_outlined),
            const SizedBox(height: 20),
            _buildField('Google Maps Link', _mapsController, Icons.map_outlined),
            const SizedBox(height: 20),
            _buildField('Monthly Rent (₹)', _rentController, Icons.currency_rupee, type: TextInputType.number),
            const SizedBox(height: 20),
            _buildTypeDropdown(),
            const SizedBox(height: 20),
            if (_type == 'PG') ...[
              _buildPGSharingDropdown(),
              const SizedBox(height: 20),
              _buildPGGenderDropdown(),
            ] else ...[
              _buildApartmentRoomDropdown(),
            ],
            const SizedBox(height: 20),
            _buildField('Description', _descController, Icons.description_outlined, maxLines: 4),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submitProperty,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('Host My Property', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController ctrl, IconData icon, {TextInputType type = TextInputType.text, int maxLines = 1}) {
    return TextField(
      controller: ctrl,
      keyboardType: type,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: AppColors.primary),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
      ),
    );
  }

  Widget _buildTypeDropdown() {
    return DropdownButtonFormField<String>(
      value: _type,
      decoration: InputDecoration(labelText: 'Category', prefixIcon: const Icon(Icons.category_outlined, color: AppColors.primary), border: OutlineInputBorder(borderRadius: BorderRadius.circular(15))),
      items: ['Apartment', 'PG', 'Room', 'Villa'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
      onChanged: (v) => setState(() => _type = v!),
    );
  }

  Widget _buildPGSharingDropdown() {
    return DropdownButtonFormField<String>(
      value: _pgRoomType,
      decoration: InputDecoration(labelText: 'Sharing Type', hintText: 'Select sharing', prefixIcon: const Icon(Icons.people_outline, color: AppColors.primary), border: OutlineInputBorder(borderRadius: BorderRadius.circular(15))),
      items: ['1x Sharing', '2x Sharing', '3x Sharing', '4x Sharing'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
      onChanged: (v) => setState(() => _pgRoomType = v!),
    );
  }

  Widget _buildPGGenderDropdown() {
    return DropdownButtonFormField<String>(
      value: _pgGender,
      decoration: InputDecoration(labelText: 'PG For', hintText: 'Select gender', prefixIcon: const Icon(Icons.person_pin_outlined, color: AppColors.primary), border: OutlineInputBorder(borderRadius: BorderRadius.circular(15))),
      items: ['Girls PG', 'Boys PG', 'Co-ed PG'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
      onChanged: (v) => setState(() => _pgGender = v!),
    );
  }

  Widget _buildApartmentRoomDropdown() {
    return DropdownButtonFormField<String>(
      value: _apartmentType,
      decoration: InputDecoration(labelText: 'BHK Type', hintText: 'Select BHK', prefixIcon: const Icon(Icons.king_bed_outlined, color: AppColors.primary), border: OutlineInputBorder(borderRadius: BorderRadius.circular(15))),
      items: ['1BHK', '2BHK', '3BHK', '4BHK', '5BHK+'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
      onChanged: (v) => setState(() => _apartmentType = v!),
    );
  }

  void _submitProperty() async {
    if (_nameController.text.isEmpty || _rentController.text.isEmpty) return;
    setState(() => _isLoading = true);
    final user = FirebaseAuth.instance.currentUser;
    try {
      final isPG = _type == 'PG';
      final fullType = isPG ? 'PGS • $_pgGender' : _type.toUpperCase();

      await FirebaseFirestore.instance.collection('posts').add({
        'ownerId': user?.uid,
        'propertyName': _nameController.text,
        'name': _nameController.text,
        'location': _locController.text,
        'colonyArea': _locController.text,
        'city': 'India',
        'rent': _rentController.text,
        'monthlyRent': _rentController.text,
        'description': _descController.text,
        'postDetails': _descController.text,
        'propertyType': fullType,
        'unitType': isPG ? _pgGender : _apartmentType,
        'roomType': isPG ? _pgRoomType : null,
        'googleMapsLink': _mapsController.text,
        'imageUrls': ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200'],
        'images': ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200'],
        'createdAt': FieldValue.serverTimestamp(),
      });
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Property Posted Successfully!')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}

class _Tag extends StatelessWidget {
  final String text;
  const _Tag({required this.text});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w800),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _InfoCard({required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: (isDark ? AppColors.bgCardDark : AppColors.bgCardLight).withOpacity(0.5),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: (isDark ? AppColors.borderDark : AppColors.borderLight).withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 20),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: isDark ? AppColors.textMainDark : AppColors.textMainLight), textAlign: TextAlign.center),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

class _ContactAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ContactAction({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.primary.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: AppColors.primary, size: 18),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
