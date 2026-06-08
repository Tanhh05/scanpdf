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

  async function loadHistory() {
    setBusy(true);
    try {
      setHistory((await getConversions()).items);
    } catch (error) {
      Alert.alert("Không thể tải lịch sử", error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (tab === "history" && user) void loadHistory();
  }, [tab, user]);

  if (loading) {
    return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style={dark ? "light" : "dark"} />
        <KeyboardAvoidingView style={styles.loginWrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.loginCard}>
            <View style={styles.logo}><Text style={styles.logoText}>PDF</Text></View>
            <Text style={styles.title}>Đăng nhập ScanPDF</Text>
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
        <View><Text style={styles.brand}>ScanPDF</Text><Text style={styles.muted}>{user.fullName}</Text></View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user.fullName.slice(0, 2).toUpperCase()}</Text></View>
      </View>

      {tab === "convert" && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>CÔNG CỤ PDF</Text>
          <Text style={styles.heading}>Chuyển đổi tài liệu</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolScroll}>
            {tools.map((item) => (
              <Pressable key={item.slug} style={[styles.toolChip, tool.slug === item.slug && styles.toolChipActive]} onPress={() => { setTool(item); setFiles([]); setOption(""); setConversion(null); }}>
                <Text style={[styles.toolText, tool.slug === item.slug && styles.toolTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.dropzone} onPress={pickFiles}>
            <Text style={styles.dropTitle}>Chọn file từ thiết bị</Text>
            <Text style={styles.muted}>{files.length ? files.map((file) => file.name).join(", ") : "Nhấn để duyệt tài liệu"}</Text>
          </Pressable>
          {"option" in tool && tool.option && (
            tool.option === "angle" ? (
              <View style={styles.angleRow}>{["90", "180", "270"].map((angle) => <Pressable key={angle} style={[styles.angle, option === angle && styles.angleActive]} onPress={() => setOption(angle)}><Text style={styles.text}>{angle}°</Text></Pressable>)}</View>
            ) : (
              <TextInput style={styles.input} secureTextEntry={tool.option === "password"} placeholder={tool.option === "signer" ? "Tên người ký" : tool.option === "text" ? "Nội dung watermark" : "Mật khẩu PDF"} placeholderTextColor={colors.muted} value={option} onChangeText={setOption} />
            )
          )}
          <Pressable style={[styles.primaryButton, (!files.length || busy) && styles.disabled]} onPress={submitConversion} disabled={!files.length || busy}>
            <Text style={styles.primaryText}>{busy ? "Đang tải lên..." : "Bắt đầu xử lý"}</Text>
          </Pressable>
          {conversion && (
            <View style={styles.statusCard}>
              <Text style={styles.text}>Trạng thái: {conversion.status}</Text>
              {conversion.errorMessage && <Text style={styles.error}>{conversion.errorMessage}</Text>}
              {conversion.status === "COMPLETED" && <Pressable style={styles.downloadButton} onPress={() => downloadAndShare(conversion).catch((error) => Alert.alert("Không thể tải file", error.message))}><Text style={styles.downloadText}>Tải hoặc chia sẻ kết quả</Text></Pressable>}
            </View>
          )}
        </ScrollView>
      )}

      {tab === "history" && (
        <View style={styles.contentFlex}>
          <View style={styles.pageRow}><View><Text style={styles.eyebrow}>TÀI KHOẢN</Text><Text style={styles.heading}>Lịch sử</Text></View><Pressable onPress={loadHistory}><Text style={styles.link}>Làm mới</Text></Pressable></View>
          {busy ? <ActivityIndicator color={colors.primary} /> : (
            <FlatList data={history} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => (
              <View style={styles.historyItem}>
                <View style={styles.historyInfo}><Text style={styles.fileName}>{item.inputFile?.originalName || item.tool}</Text><Text style={styles.muted}>{item.status} · {new Date(item.createdAt).toLocaleDateString("vi-VN")}</Text></View>
                {item.canDownload && <Pressable onPress={() => downloadAndShare(item).catch((error) => Alert.alert("Lỗi", error.message))}><Text style={styles.link}>Tải</Text></Pressable>}
              </View>
            )} ListEmptyComponent={<Text style={styles.muted}>Chưa có lịch sử chuyển đổi.</Text>} />
          )}
        </View>
      )}

      {tab === "settings" && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>HỆ THỐNG</Text><Text style={styles.heading}>Cài đặt</Text>
          <Text style={styles.label}>API URL</Text>
          <TextInput style={styles.input} autoCapitalize="none" value={apiUrl} onChangeText={updateApiUrl} />
          <Pressable style={styles.primaryButton} onPress={async () => { updateApiUrl(await setApiUrl(apiUrl)); Alert.alert("Đã lưu", "API URL đã được cập nhật"); }}><Text style={styles.primaryText}>Lưu API URL</Text></Pressable>
          <Pressable style={styles.logoutButton} onPress={async () => { await logout(); setUser(null); }}><Text style={styles.error}>Đăng xuất</Text></Pressable>
        </ScrollView>
      )}

      <View style={styles.tabs}>
        {(["convert", "history", "settings"] as Tab[]).map((item) => <Pressable key={item} style={styles.tab} onPress={() => setTab(item)}><Text style={[styles.tabText, tab === item && styles.tabActive]}>{item === "convert" ? "Chuyển đổi" : item === "history" ? "Lịch sử" : "Cài đặt"}</Text></Pressable>)}
      </View>
    </SafeAreaView>
  );
}

const lightColors = { background: "#f8fafc", surface: "#ffffff", text: "#0f172a", muted: "#64748b", border: "#e2e8f0", primary: "#5b5cf0" };
const darkColors = { background: "#0b1120", surface: "#111827", text: "#f8fafc", muted: "#94a3b8", border: "#334155", primary: "#818cf8" };

function makeStyles(colors: typeof lightColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    loginWrap: { flex: 1, justifyContent: "center", padding: 22 },
    loginCard: { gap: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 24, backgroundColor: colors.surface, padding: 24 },
    logo: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: colors.primary },
    logoText: { color: "#fff", fontSize: 15, fontWeight: "900" },
    title: { color: colors.text, fontSize: 27, fontWeight: "900" },
    heading: { color: colors.text, fontSize: 27, fontWeight: "900" },
    eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
    text: { color: colors.text },
    muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    label: { color: colors.text, fontSize: 13, fontWeight: "800" },
    input: { minHeight: 49, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14 },
    primaryButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 16 },
    primaryText: { color: "#fff", fontWeight: "900" },
    disabled: { opacity: 0.5 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 12 },
    brand: { color: colors.text, fontSize: 20, fontWeight: "900" },
    avatar: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: colors.primary },
    avatarText: { color: "#fff", fontWeight: "900" },
    content: { gap: 16, padding: 20, paddingBottom: 100 },
    contentFlex: { flex: 1, padding: 20, paddingBottom: 76 },
    toolScroll: { flexGrow: 0, marginHorizontal: -20, paddingHorizontal: 20 },
    toolChip: { marginRight: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 999, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10 },
    toolChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    toolText: { color: colors.text, fontSize: 12, fontWeight: "800" },
    toolTextActive: { color: "#fff" },
    dropzone: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderStyle: "dashed", borderColor: colors.primary, borderRadius: 18, backgroundColor: colors.surface, padding: 20 },
    dropTitle: { color: colors.primary, fontSize: 17, fontWeight: "900" },
    angleRow: { flexDirection: "row", gap: 10 },
    angle: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.surface, padding: 12 },
    angleActive: { borderColor: colors.primary },
    statusCard: { gap: 10, borderRadius: 14, backgroundColor: colors.surface, padding: 16 },
    error: { color: "#ef4444", fontWeight: "800" },
    downloadButton: { alignItems: "center", borderRadius: 10, backgroundColor: "#dcfce7", padding: 12 },
    downloadText: { color: "#047857", fontWeight: "900" },
    pageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    link: { color: colors.primary, fontWeight: "900" },
    list: { gap: 10, paddingBottom: 20 },
    historyItem: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, padding: 15 },
    historyInfo: { flex: 1, gap: 4 },
    fileName: { color: colors.text, fontWeight: "800" },
    logoutButton: { alignItems: "center", borderWidth: 1, borderColor: "#ef4444", borderRadius: 12, padding: 14 },
    tabs: { position: "absolute", right: 0, bottom: 0, left: 0, flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: Platform.OS === "ios" ? 12 : 4 },
    tab: { flex: 1, alignItems: "center", paddingVertical: 14 },
    tabText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
    tabActive: { color: colors.primary },
  });
}
