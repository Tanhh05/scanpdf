import * as DocumentPicker from "expo-document-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import {
  createConversion,
  downloadAndShare,
  getApiUrl,
  getConversion,
  getConversions,
  getMe,
  getToken,
  login,
  logout,
  setApiUrl,
} from "./api";
import type { Conversion, PickedFile, User } from "./types";

const tools = [
  { slug: "word-to-pdf", label: "Word → PDF" },
  { slug: "pdf-to-word", label: "PDF → Word" },
  { slug: "compress-pdf", label: "Nén PDF" },
  { slug: "merge-pdf", label: "Ghép PDF", multiple: true, minimum: 2 },
  { slug: "jpg-to-pdf", label: "JPG → PDF", multiple: true },
  { slug: "pdf-to-jpg", label: "PDF → JPG" },
  { slug: "ocr-pdf", label: "OCR PDF" },
  { slug: "split-pdf", label: "Tách PDF" },
  { slug: "rotate-pdf", label: "Xoay PDF", option: "angle" },
  { slug: "watermark-pdf", label: "Watermark", option: "text" },
  { slug: "protect-pdf", label: "Khóa PDF", option: "password" },
  { slug: "unlock-pdf", label: "Mở khóa PDF", option: "password" },
  { slug: "sign-pdf", label: "Ký PDF", option: "signer" },
] as const;

type Tab = "convert" | "history" | "settings";

const tabLabels: Record<Tab, string> = {
  convert: "Chuyển đổi",
  history: "Lịch sử",
  settings: "Cài đặt",
};

const statusLabels: Record<Conversion["status"], string> = {
  QUEUED: "Đang chờ",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  FAILED: "Thất bại",
};

function initials(name?: string) {
  return (name || "SP")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatFileSize(size?: number) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

export default function App() {
  const dark = useColorScheme() === "dark";
  const colors = useMemo(() => dark ? darkColors : lightColors, [dark]);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);
  const [tab, setTab] = useState<Tab>("convert");
  const [tool, setTool] = useState<(typeof tools)[number]>(tools[0]!);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [option, setOption] = useState("");
  const [conversion, setConversion] = useState<Conversion | null>(null);
  const [history, setHistory] = useState<Conversion[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [apiUrl, updateApiUrl] = useState("");

  useEffect(() => {
    Promise.all([getToken(), getApiUrl()]).then(async ([token, url]) => {
      updateApiUrl(url);
      if (token) {
        try {
          setUser(await getMe());
        } catch {
          await logout();
        }
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!conversion || !["QUEUED", "PROCESSING"].includes(conversion.status)) return;
    const timer = setInterval(async () => {
      try {
        setConversion(await getConversion(conversion.id));
      } catch (error) {
        clearInterval(timer);
        Alert.alert("Lỗi", error instanceof Error ? error.message : "Không thể cập nhật trạng thái");
      }
    }, 1800);
    return () => clearInterval(timer);
  }, [conversion]);

  async function submitLogin() {
    setBusy(true);
    try {
      updateApiUrl(await setApiUrl(apiUrl));
      setUser(await login(email, password, otp));
    } catch (error) {
      if (error instanceof Error && "requiresTwoFactor" in error) {
        setNeedsOtp(Boolean((error as Error & { requiresTwoFactor?: boolean }).requiresTwoFactor));
      }
      Alert.alert("Đăng nhập thất bại", error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  async function pickFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      multiple: "multiple" in tool && Boolean(tool.multiple),
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      setFiles(result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
      })));
    }
  }

  async function submitConversion() {
    if (files.length < ("minimum" in tool ? tool.minimum ?? 1 : 1)) {
      Alert.alert("Thiếu file", "Vui lòng chọn đủ file cho công cụ này");
      return;
    }
    setBusy(true);
    try {
      const options = "option" in tool && tool.option ? { [tool.option]: option } : {};
      setConversion(await createConversion(tool.slug, files, options));
    } catch (error) {
      Alert.alert("Không thể chuyển đổi", error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory(page = historyPage) {
    setBusy(true);
    try {
      const data = await getConversions(page);
      setHistory(data.items);
      setHistoryPage(data.page);
      setHistoryPages(Math.max(1, data.pages));
    } catch (error) {
      Alert.alert("Không thể tải lịch sử", error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (tab === "history" && user) void loadHistory();
  }, [historyPage, tab, user]);

  if (loading) {
    return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style={dark ? "light" : "dark"} />
        <KeyboardAvoidingView style={styles.loginWrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.loginIntro}>
            <View style={styles.logo}><Text style={styles.logoText}>PDF</Text></View>
            <Text style={styles.title}>ScanPDF Mobile</Text>
            <Text style={styles.muted}>Chuyển đổi, tải kết quả và theo dõi lịch sử từ điện thoại.</Text>
          </View>
          <View style={styles.loginCard}>
            <Text style={styles.cardTitle}>Đăng nhập</Text>
            <Text style={styles.muted}>Dùng chung tài khoản với website ScanPDF.</Text>
            <TextInput style={styles.input} placeholder="API URL" placeholderTextColor={colors.muted} autoCapitalize="none" value={apiUrl} onChangeText={updateApiUrl} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder="Mật khẩu" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} />
            {needsOtp && <TextInput style={styles.input} placeholder="Mã 2FA" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} />}
            <Pressable style={styles.primaryButton} onPress={submitLogin} disabled={busy}>
              <Text style={styles.primaryText}>{busy ? "Đang đăng nhập..." : "Đăng nhập"}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={dark ? "light" : "dark"} />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>ScanPDF</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{user.fullName}</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(user.fullName)}</Text></View>
      </View>

      {tab === "convert" && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>CÔNG CỤ PDF</Text>
            <Text style={styles.heading}>Chuyển đổi tài liệu</Text>
            <Text style={styles.heroText}>Chọn công cụ, tải file lên và nhận kết quả ngay trong lịch sử.</Text>
          </View>
          <View style={styles.toolGrid}>
            {tools.map((item) => (
              <Pressable key={item.slug} style={[styles.toolChip, tool.slug === item.slug && styles.toolChipActive]} onPress={() => { setTool(item); setFiles([]); setOption(""); setConversion(null); }}>
                <Text style={[styles.toolText, tool.slug === item.slug && styles.toolTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.selectedToolCard}>
            <Text style={styles.label}>Đang chọn</Text>
            <Text style={styles.cardTitle}>{tool.label}</Text>
            <Text style={styles.muted}>{"multiple" in tool && tool.multiple ? `Cho phép chọn nhiều file${"minimum" in tool && tool.minimum ? `, tối thiểu ${tool.minimum}` : ""}.` : "Công cụ này xử lý một file mỗi lần."}</Text>
          </View>
          <Pressable style={styles.dropzone} onPress={pickFiles}>
            <Text style={styles.dropTitle}>Chọn file từ thiết bị</Text>
            <Text style={styles.muted}>{files.length ? `${files.length} file đã chọn` : "Nhấn để duyệt tài liệu"}</Text>
          </Pressable>
          {files.length > 0 && (
            <View style={styles.fileList}>
              {files.map((file) => (
                <View key={`${file.uri}-${file.name}`} style={styles.fileRow}>
                  <View style={styles.fileIcon}><Text style={styles.fileIconText}>PDF</Text></View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                    <Text style={styles.muted}>{formatFileSize(file.size) || file.mimeType || "Tài liệu"}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          {"option" in tool && tool.option && (
            tool.option === "angle" ? (
              <View style={styles.angleRow}>{["90", "180", "270"].map((angle) => <Pressable key={angle} style={[styles.angle, option === angle && styles.angleActive]} onPress={() => setOption(angle)}><Text style={[styles.text, option === angle && styles.angleTextActive]}>{angle}°</Text></Pressable>)}</View>
            ) : (
              <TextInput style={styles.input} secureTextEntry={tool.option === "password"} placeholder={tool.option === "signer" ? "Tên người ký" : tool.option === "text" ? "Nội dung watermark" : "Mật khẩu PDF"} placeholderTextColor={colors.muted} value={option} onChangeText={setOption} />
            )
          )}
          <Pressable style={[styles.primaryButton, (!files.length || busy) && styles.disabled]} onPress={submitConversion} disabled={!files.length || busy}>
            <Text style={styles.primaryText}>{busy ? "Đang tải lên..." : "Bắt đầu xử lý"}</Text>
          </Pressable>
          {conversion && (
            <View style={styles.statusCard}>
              <Text style={styles.label}>Kết quả xử lý</Text>
              <Text style={styles.cardTitle}>{statusLabels[conversion.status]}</Text>
              {conversion.errorMessage && <Text style={styles.error}>{conversion.errorMessage}</Text>}
              {conversion.status === "COMPLETED" && <Pressable style={styles.downloadButton} onPress={() => downloadAndShare(conversion).catch((error) => Alert.alert("Không thể tải file", error.message))}><Text style={styles.downloadText}>Tải hoặc chia sẻ kết quả</Text></Pressable>}
            </View>
          )}
        </ScrollView>
      )}

      {tab === "history" && (
        <View style={styles.contentFlex}>
          <View style={styles.pageRow}>
            <View style={styles.pageTitleBlock}>
              <Text style={styles.eyebrow}>TÀI KHOẢN</Text>
              <Text style={styles.heading}>Lịch sử</Text>
              <Text style={styles.heroText}>Theo dõi file đã xử lý và tải lại kết quả còn hiệu lực.</Text>
            </View>
            <Pressable style={styles.secondaryButton} onPress={() => loadHistory()}><Text style={styles.link}>Làm mới</Text></Pressable>
          </View>
          {busy ? <ActivityIndicator color={colors.primary} /> : (
            <FlatList data={history} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => (
              <View style={styles.historyItem}>
                <View style={styles.fileIcon}><Text style={styles.fileIconText}>PDF</Text></View>
                <View style={styles.historyInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{item.inputFile?.originalName || item.tool}</Text>
                  <Text style={styles.muted}>{statusLabels[item.status]} · {new Date(item.createdAt).toLocaleDateString("vi-VN")}</Text>
                </View>
                {item.canDownload && <Pressable style={styles.smallAction} onPress={() => downloadAndShare(item).catch((error) => Alert.alert("Lỗi", error.message))}><Text style={styles.link}>Tải</Text></Pressable>}
              </View>
            )} ListEmptyComponent={<Text style={styles.muted}>Chưa có lịch sử chuyển đổi.</Text>} ListFooterComponent={historyPages > 1 ? (
              <View style={styles.pagination}>
                <Pressable disabled={historyPage <= 1} onPress={() => setHistoryPage((value) => value - 1)} style={[styles.pageButton, historyPage <= 1 && styles.disabled]}>
                  <Text style={styles.text}>Trước</Text>
                </Pressable>
                <Text style={styles.muted}>Trang {historyPage}/{historyPages}</Text>
                <Pressable disabled={historyPage >= historyPages} onPress={() => setHistoryPage((value) => value + 1)} style={[styles.pageButton, historyPage >= historyPages && styles.disabled]}>
                  <Text style={styles.text}>Sau</Text>
                </Pressable>
              </View>
            ) : null} />
          )}
        </View>
      )}

      {tab === "settings" && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>HỆ THỐNG</Text>
            <Text style={styles.heading}>Cài đặt</Text>
            <Text style={styles.heroText}>Điều chỉnh endpoint backend cho môi trường local hoặc deploy.</Text>
          </View>
          <View style={styles.settingsCard}>
            <Text style={styles.label}>API URL</Text>
            <TextInput style={styles.input} autoCapitalize="none" value={apiUrl} onChangeText={updateApiUrl} />
            <Pressable style={styles.primaryButton} onPress={async () => { updateApiUrl(await setApiUrl(apiUrl)); Alert.alert("Đã lưu", "API URL đã được cập nhật"); }}><Text style={styles.primaryText}>Lưu API URL</Text></Pressable>
          </View>
          <Pressable style={styles.logoutButton} onPress={async () => { await logout(); setUser(null); }}><Text style={styles.error}>Đăng xuất</Text></Pressable>
        </ScrollView>
      )}

      <View style={styles.tabs}>
        {(["convert", "history", "settings"] as Tab[]).map((item) => (
          <Pressable key={item} style={[styles.tab, tab === item && styles.tabCurrent]} onPress={() => setTab(item)}>
            <Text style={[styles.tabText, tab === item && styles.tabActive]}>{tabLabels[item]}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const lightColors = { background: "#f3f7fb", surface: "#ffffff", surfaceSoft: "#eef8fd", text: "#17201d", muted: "#64748b", border: "#d8ded5", primary: "#10aee8", primaryStrong: "#0789c5" };
const darkColors = { background: "#07131a", surface: "#101820", surfaceSoft: "#0f2533", text: "#f8fafc", muted: "#94a3b8", border: "#334155", primary: "#38bdf8", primaryStrong: "#7dd3fc" };

function makeStyles(colors: typeof lightColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    loginWrap: { flex: 1, justifyContent: "center", gap: 18, padding: 22 },
    loginIntro: { gap: 10, paddingHorizontal: 4 },
    loginCard: { gap: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.surface, padding: 20, shadowColor: "#17201d", shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
    logo: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.primary },
    logoText: { color: "#fff", fontSize: 15, fontWeight: "900" },
    title: { color: colors.text, fontSize: 32, fontWeight: "900", letterSpacing: -0.2 },
    heading: { color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.2 },
    cardTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
    eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
    text: { color: colors.text },
    muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
    heroText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
    label: { color: colors.text, fontSize: 13, fontWeight: "800" },
    input: { minHeight: 51, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14 },
    primaryButton: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.primary, paddingHorizontal: 16 },
    primaryText: { color: "#fff", fontWeight: "900" },
    secondaryButton: { minHeight: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 999, backgroundColor: colors.surface, paddingHorizontal: 14 },
    disabled: { opacity: 0.5 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 14 },
    brand: { color: colors.text, fontSize: 21, fontWeight: "900" },
    headerSubtitle: { maxWidth: 240, color: colors.muted, fontSize: 13, lineHeight: 18 },
    avatar: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: colors.primary },
    avatarText: { color: "#fff", fontWeight: "900" },
    content: { gap: 14, padding: 18, paddingBottom: 112 },
    contentFlex: { flex: 1, padding: 18, paddingBottom: 84 },
    heroCard: { gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.surface, padding: 18 },
    toolGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
    toolChip: { width: "48.5%", minHeight: 54, justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 10 },
    toolChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    toolText: { color: colors.text, fontSize: 13, fontWeight: "800" },
    toolTextActive: { color: "#fff" },
    selectedToolCard: { gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surface, padding: 16 },
    dropzone: { minHeight: 150, alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderStyle: "dashed", borderColor: colors.primary, borderRadius: 20, backgroundColor: colors.surfaceSoft, padding: 20 },
    dropTitle: { color: colors.primaryStrong, fontSize: 18, fontWeight: "900" },
    fileList: { gap: 10 },
    fileRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, padding: 12 },
    fileIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surfaceSoft },
    fileIconText: { color: colors.primaryStrong, fontSize: 10, fontWeight: "900" },
    angleRow: { flexDirection: "row", gap: 10 },
    angle: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, padding: 13 },
    angleActive: { borderColor: colors.primary, backgroundColor: colors.surfaceSoft },
    angleTextActive: { color: colors.primaryStrong, fontWeight: "900" },
    statusCard: { gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surface, padding: 16 },
    error: { color: "#ef4444", fontWeight: "800" },
    downloadButton: { alignItems: "center", borderRadius: 14, backgroundColor: "#dcfce7", padding: 13 },
    downloadText: { color: "#047857", fontWeight: "900" },
    pageRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 16 },
    pageTitleBlock: { flex: 1, gap: 5 },
    link: { color: colors.primaryStrong, fontWeight: "900" },
    list: { gap: 10, paddingBottom: 24 },
    historyItem: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, padding: 13 },
    historyInfo: { flex: 1, gap: 4 },
    fileName: { color: colors.text, fontWeight: "900" },
    smallAction: { minHeight: 38, justifyContent: "center", borderRadius: 999, backgroundColor: colors.surfaceSoft, paddingHorizontal: 14 },
    pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
    pageButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 10 },
    settingsCard: { gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surface, padding: 16 },
    logoutButton: { alignItems: "center", borderWidth: 1, borderColor: "#ef4444", borderRadius: 14, backgroundColor: colors.surface, padding: 14 },
    tabs: { position: "absolute", right: 12, bottom: Platform.OS === "ios" ? 12 : 8, left: 12, flexDirection: "row", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.surface, padding: 6, shadowColor: "#17201d", shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
    tab: { flex: 1, alignItems: "center", borderRadius: 16, paddingVertical: 11 },
    tabCurrent: { backgroundColor: colors.surfaceSoft },
    tabText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
    tabActive: { color: colors.primaryStrong },
  });
}
