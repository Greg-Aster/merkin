import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  parseBannerModuleConfig,
  parseSiteBannerConfig,
  parseTravelSequenceConfig,
  updateBannerModuleConfig,
  updateSiteBannerConfig,
  updateTravelSequenceConfig,
} from '../utils/bannerConfig'
import {
  buildPublicBannerFilename,
  buildSequenceBannerFilename,
  getBannerTarget,
  toPublicBannerUrl,
} from '../utils/bannerTargets'
import { fetchRepoPost, publishAsset, publishFile } from '../utils/gitlab'
import { loadSettings } from '../utils/storage'
import { getSiteTheme, SITE_THEMES } from '../utils/siteThemes'
import { alpha, useAppTheme } from '../utils/theme'

const PROVIDERS = [
  { id: 'gitlab', label: 'GitLab', color: '#fc6d26' },
  { id: 'github', label: 'GitHub', color: '#24292e' },
]

const BANNER_TYPES = ['standard', 'image', 'video', 'timeline']
const POSITION_PRESETS = ['center', 'top', 'bottom', 'left', 'right', 'center center']

function validateProviderSettings(provider, settings) {
  const providers = settings?.providers || {}
  if (provider === 'github') {
    const github = providers.github || {}
    if (!github.token) return 'Add your GitHub token in Settings first.'
    if (!github.owner || !github.repo) return 'Set GitHub owner and repo in Settings first.'
    return null
  }

  const gitlab = providers.gitlab || {}
  if (!gitlab.token) return 'Add your GitLab token in Settings first.'
  if (!gitlab.project) return 'Set your GitLab project path in Settings first.'
  return null
}

function coerceNumber(value, fallback) {
  const numeric = Number(String(value || '').trim())
  return Number.isFinite(numeric) ? numeric : fallback
}

function createPendingAsset(asset, filename) {
  return {
    uri: asset.uri,
    filename,
    width: asset.width || 0,
    height: asset.height || 0,
  }
}

async function pickImage(nextFilename) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.9,
    allowsEditing: false,
  })

  if (result.canceled || !result.assets?.[0]) return null
  const asset = result.assets[0]
  const fileName = asset.fileName || nextFilename
  return createPendingAsset(asset, fileName)
}

export default function BannerEditorScreen({ navigation }) {
  const theme = useAppTheme()
  const colors = theme.colors
  const styles = useMemo(() => createStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [settings, setSettings] = useState(null)
  const [siteId, setSiteId] = useState('travel')
  const [provider, setProvider] = useState('gitlab')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [siteConfigRemote, setSiteConfigRemote] = useState(null)
  const [bannerConfigRemote, setBannerConfigRemote] = useState(null)

  const [siteBanner, setSiteBanner] = useState(null)
  const [bannerModule, setBannerModule] = useState(null)
  const [travelSequence, setTravelSequence] = useState(null)

  const target = getBannerTarget(siteId)
  const siteTheme = getSiteTheme(siteId)

  const loadRemoteConfig = useCallback(async () => {
    const nextSettings = await loadSettings()
    setSettings(nextSettings)

    if (!target) {
      setLoadError('No banner target is configured for this site.')
      setLoading(false)
      return
    }

    const providerError = validateProviderSettings(provider, nextSettings)
    if (providerError) {
      setLoadError(providerError)
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError('')

    const siteResult = await fetchRepoPost(nextSettings, provider, target.siteConfigPath)
    if (!siteResult.ok) {
      setLoadError(siteResult.error)
      setLoading(false)
      return
    }

    const bannerResult = await fetchRepoPost(nextSettings, provider, target.bannerConfigPath)
    if (!bannerResult.ok) {
      setLoadError(bannerResult.error)
      setLoading(false)
      return
    }

    setSiteConfigRemote({
      ...siteResult.remoteFile,
      raw: siteResult.raw,
    })
    setBannerConfigRemote({
      ...bannerResult.remoteFile,
      raw: bannerResult.raw,
    })
    setSiteBanner(parseSiteBannerConfig(siteResult.raw))
    setBannerModule(parseBannerModuleConfig(bannerResult.raw))
    setTravelSequence(target.supportsSequence ? parseTravelSequenceConfig(bannerResult.raw) : null)
    setLoading(false)
  }, [provider, target])

  useEffect(() => {
    navigation.setOptions({ headerShown: false })
  }, [navigation])

  useEffect(() => {
    loadRemoteConfig()
  }, [loadRemoteConfig])

  async function handlePickMainBanner() {
    const pending = await pickImage('banner-main.jpg')
    if (!pending) return
    setSiteBanner(prev => ({
      ...prev,
      pendingImage: pending,
    }))
  }

  async function handlePickSequenceSlot(slotIndex) {
    const slot = travelSequence?.slots?.[slotIndex]
    if (!slot) return
    const pending = await pickImage(slot.filename || `banner-slot-${slotIndex + 1}.jpg`)
    if (!pending) return
    setTravelSequence(prev => ({
      ...prev,
      slots: prev.slots.map((entry, index) => (
        index === slotIndex
          ? { ...entry, pendingImage: pending }
          : entry
      )),
    }))
  }

  async function handleSave() {
    if (!settings || !target || !siteBanner || !bannerModule || !siteConfigRemote || !bannerConfigRemote) {
      return
    }

    const providerError = validateProviderSettings(provider, settings)
    if (providerError) {
      Alert.alert('Destination not configured', providerError)
      return
    }

    setSaving(true)

    let nextSiteBanner = { ...siteBanner }
    let nextTravelSequence = travelSequence

    try {
      if (nextSiteBanner.pendingImage) {
        const filename = buildPublicBannerFilename(nextSiteBanner.pendingImage.filename, siteId)
        const remotePath = `${target.publicBannerDir}/${filename}`
        const uploadResult = await publishAsset(
          { ...nextSiteBanner.pendingImage, filename },
          settings,
          remotePath,
          provider,
          { commitMessage: `add banner asset: ${filename}` }
        )

        if (!uploadResult.ok) {
          throw new Error(uploadResult.error)
        }

        nextSiteBanner = {
          ...nextSiteBanner,
          src: toPublicBannerUrl(filename),
          pendingImage: null,
        }
      }

      if (target.supportsSequence && nextTravelSequence?.slots?.length) {
        const updatedSlots = []
        for (const slot of nextTravelSequence.slots) {
          if (!slot.pendingImage) {
            updatedSlots.push(slot)
            continue
          }

          const filename = buildSequenceBannerFilename(slot.pendingImage.filename, slot.index)
          const remotePath = `${target.sequenceAssetDir}/${filename}`
          const uploadResult = await publishAsset(
            { ...slot.pendingImage, filename },
            settings,
            remotePath,
            provider,
            { commitMessage: `add banner slot asset: ${filename}` }
          )

          if (!uploadResult.ok) {
            throw new Error(uploadResult.error)
          }

          updatedSlots.push({
            ...slot,
            filename,
            pendingImage: null,
          })
        }

        nextTravelSequence = {
          ...nextTravelSequence,
          slots: updatedSlots,
        }
      }

      let nextSiteConfigSource = updateSiteBannerConfig(siteConfigRemote.raw || '', nextSiteBanner)
      let nextBannerConfigSource = target.supportsSequence
        ? updateTravelSequenceConfig(bannerConfigRemote.raw || '', {
            ...bannerModule,
            animationInterval: coerceNumber(bannerModule.animationInterval, 12000),
            transitionDuration: coerceNumber(bannerModule.transitionDuration, 1800),
            ...nextTravelSequence,
          })
        : updateBannerModuleConfig(bannerConfigRemote.raw || '', {
            ...bannerModule,
            animationInterval: coerceNumber(bannerModule.animationInterval, 12000),
            transitionDuration: coerceNumber(bannerModule.transitionDuration, 1800),
          })

      const siteConfigPush = await publishFile(
        'config.ts',
        nextSiteConfigSource,
        settings,
        target.siteConfigPath,
        provider,
        {
          remotePath: target.siteConfigPath,
          sourceSha: siteConfigRemote.sha,
          lastCommitId: siteConfigRemote.lastCommitId,
        }
      )

      if (!siteConfigPush.ok) {
        throw new Error(siteConfigPush.error)
      }

      const bannerConfigPush = await publishFile(
        'banner.config.ts',
        nextBannerConfigSource,
        settings,
        target.bannerConfigPath,
        provider,
        {
          remotePath: target.bannerConfigPath,
          sourceSha: bannerConfigRemote.sha,
          lastCommitId: bannerConfigRemote.lastCommitId,
        }
      )

      if (!bannerConfigPush.ok) {
        throw new Error(bannerConfigPush.error)
      }

      setSiteBanner(nextSiteBanner)
      setTravelSequence(nextTravelSequence)
      Alert.alert('Banner updated', `${siteTheme.label} banner settings were pushed to ${provider}.`)
      await loadRemoteConfig()
    } catch (error) {
      Alert.alert('Push failed', error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }

  function renderToggle(label, value, onPress) {
    return (
      <TouchableOpacity style={styles.toggleRow} onPress={onPress} activeOpacity={0.82}>
        <View>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.hint}>{value ? 'Enabled' : 'Disabled'}</Text>
        </View>
        <View style={[styles.togglePill, value && styles.togglePillActive]}>
          <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
        </View>
      </TouchableOpacity>
    )
  }

  function renderProviderChips() {
    return (
      <View style={styles.choiceRow}>
        {PROVIDERS.map(choice => (
          <TouchableOpacity
            key={choice.id}
            style={[
              styles.choiceChip,
              provider === choice.id && { backgroundColor: choice.color, borderColor: choice.color },
            ]}
            onPress={() => setProvider(choice.id)}
          >
            <Text style={[styles.choiceChipText, provider === choice.id && styles.choiceChipTextActive]}>
              {choice.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  function renderSiteChips() {
    return (
      <View style={styles.choiceWrap}>
        {SITE_THEMES.map(choice => (
          <TouchableOpacity
            key={choice.id}
            style={[
              styles.siteChip,
              siteId === choice.id && { borderColor: choice.color, backgroundColor: alpha(choice.color, '18') },
            ]}
            onPress={() => setSiteId(choice.id)}
          >
            <Text style={styles.siteChipTitle}>{choice.label}</Text>
            <Text style={styles.siteChipBody}>{choice.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  function renderMainBannerPreview() {
    if (!siteBanner?.pendingImage?.uri) return null
    return <Image source={{ uri: siteBanner.pendingImage.uri }} style={styles.previewImage} />
  }

  function renderSequenceSlots() {
    if (!target?.supportsSequence || !travelSequence?.slots?.length) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Travel Banner Slots</Text>
        <Text style={styles.hint}>
          Replace one rotating background slot at a time and optionally change which slot is the default first frame.
        </Text>

        {renderToggle(
          'Rotation enabled',
          bannerModule.animationEnabled,
          () => setBannerModule(prev => ({ ...prev, animationEnabled: !prev.animationEnabled }))
        )}

        {renderToggle(
          'Random start',
          bannerModule.randomStart,
          () => setBannerModule(prev => ({ ...prev, randomStart: !prev.randomStart }))
        )}

        <Text style={styles.label}>Rotation interval (ms)</Text>
        <TextInput
          style={styles.input}
          value={String(bannerModule.animationInterval || '')}
          onChangeText={value => setBannerModule(prev => ({ ...prev, animationInterval: value }))}
          keyboardType="numeric"
          placeholder="12000"
          placeholderTextColor={colors.placeholder}
        />

        <Text style={styles.label}>Transition duration (ms)</Text>
        <TextInput
          style={styles.input}
          value={String(bannerModule.transitionDuration || '')}
          onChangeText={value => setBannerModule(prev => ({ ...prev, transitionDuration: value }))}
          keyboardType="numeric"
          placeholder="1800"
          placeholderTextColor={colors.placeholder}
        />

        {travelSequence.slots.map((slot, index) => {
          const isDefault = travelSequence.defaultBanner === slot.variableName
          const previewUri = slot.pendingImage?.uri || null
          const pendingName = slot.pendingImage?.filename || slot.filename
          return (
            <View key={slot.id} style={styles.slotCard}>
              <View style={styles.slotHeader}>
                <View>
                  <Text style={styles.slotTitle}>Slot {index + 1}</Text>
                  <Text style={styles.slotFilename}>{pendingName}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.defaultBtn, isDefault && styles.defaultBtnActive]}
                  onPress={() => setTravelSequence(prev => ({ ...prev, defaultBanner: slot.variableName }))}
                >
                  <Text style={[styles.defaultBtnText, isDefault && styles.defaultBtnTextActive]}>
                    {isDefault ? 'Default' : 'Set Default'}
                  </Text>
                </TouchableOpacity>
              </View>

              {previewUri ? <Image source={{ uri: previewUri }} style={styles.slotPreview} /> : null}

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => handlePickSequenceSlot(index)}>
                <Ionicons name="image-outline" size={16} color={colors.link} />
                <Text style={styles.secondaryBtnText}>Replace Slot Image</Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </View>
    )
  }

  if (loading && !siteBanner) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={siteTheme.color} />
        <Text style={styles.centerStateText}>Loading banner configuration…</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Banner Config</Text>
        <TouchableOpacity onPress={loadRemoteConfig} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="refresh-outline" size={22} color={colors.headerText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 36 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Direct Config Push</Text>
          <Text style={styles.heroTitle}>Edit site banner settings and publish them without leaving your phone.</Text>
          <Text style={styles.heroBody}>
            This screen updates the real config files in the repo. Travel also exposes the rotating banner slots.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target</Text>
          <Text style={styles.label}>Site</Text>
          {renderSiteChips()}
          <Text style={styles.label}>Provider</Text>
          {renderProviderChips()}
          {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
        </View>

        {siteBanner && bannerModule ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Main Banner</Text>

              {renderToggle(
                'Banner enabled',
                siteBanner.enabled,
                () => setSiteBanner(prev => ({ ...prev, enabled: !prev.enabled }))
              )}

              <Text style={styles.label}>Current image path</Text>
              <TextInput
                style={styles.input}
                value={siteBanner.src}
                onChangeText={value => setSiteBanner(prev => ({ ...prev, src: value }))}
                placeholder="/assets/banner/0001.png"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity style={styles.secondaryBtn} onPress={handlePickMainBanner}>
                <Ionicons name="images-outline" size={16} color={colors.link} />
                <Text style={styles.secondaryBtnText}>Choose New Banner Image</Text>
              </TouchableOpacity>

              {siteBanner.pendingImage ? (
                <Text style={styles.pendingText}>
                  Pending upload: {siteBanner.pendingImage.filename}
                </Text>
              ) : null}

              {renderMainBannerPreview()}

              <Text style={styles.label}>Banner position</Text>
              <View style={styles.choiceRowWrap}>
                {POSITION_PRESETS.map(position => (
                  <TouchableOpacity
                    key={position}
                    style={[
                      styles.choiceChip,
                      siteBanner.position === position && styles.choiceChipSelected,
                    ]}
                    onPress={() => setSiteBanner(prev => ({ ...prev, position }))}
                  >
                    <Text style={[
                      styles.choiceChipText,
                      siteBanner.position === position && styles.choiceChipTextActiveGreen,
                    ]}>
                      {position}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {renderToggle(
                'Banner credit enabled',
                siteBanner.creditEnabled,
                () => setSiteBanner(prev => ({ ...prev, creditEnabled: !prev.creditEnabled }))
              )}

              <Text style={styles.label}>Credit text</Text>
              <TextInput
                style={styles.input}
                value={siteBanner.creditText}
                onChangeText={value => setSiteBanner(prev => ({ ...prev, creditText: value }))}
                placeholder="Photographer name"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={styles.label}>Credit URL</Text>
              <TextInput
                style={styles.input}
                value={siteBanner.creditUrl}
                onChangeText={value => setSiteBanner(prev => ({ ...prev, creditUrl: value }))}
                placeholder="https://..."
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Banner Module</Text>

              <Text style={styles.label}>Default banner type</Text>
              <View style={styles.choiceRowWrap}>
                {BANNER_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.choiceChip,
                      bannerModule.defaultBannerType === type && styles.choiceChipSelected,
                    ]}
                    onPress={() => setBannerModule(prev => ({ ...prev, defaultBannerType: type }))}
                  >
                    <Text style={[
                      styles.choiceChipText,
                      bannerModule.defaultBannerType === type && styles.choiceChipTextActiveGreen,
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Desktop height</Text>
              <TextInput
                style={styles.input}
                value={bannerModule.layoutHeight}
                onChangeText={value => setBannerModule(prev => ({ ...prev, layoutHeight: value }))}
                placeholder="80vh"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={styles.label}>Mobile height</Text>
              <TextInput
                style={styles.input}
                value={bannerModule.layoutMobileHeight}
                onChangeText={value => setBannerModule(prev => ({ ...prev, layoutMobileHeight: value }))}
                placeholder="50vh"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={styles.label}>Object position</Text>
              <TextInput
                style={styles.input}
                value={bannerModule.objectPosition}
                onChangeText={value => setBannerModule(prev => ({ ...prev, objectPosition: value }))}
                placeholder="center"
                placeholderTextColor={colors.placeholder}
              />

              {renderToggle(
                'Parallax enabled',
                bannerModule.parallaxEnabled,
                () => setBannerModule(prev => ({ ...prev, parallaxEnabled: !prev.parallaxEnabled }))
              )}
            </View>

            {renderSequenceSlots()}

            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />}
              <Text style={styles.primaryBtnText}>{saving ? 'Publishing…' : 'Push Banner Changes'}</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 14,
    },
    centerStateText: {
      color: colors.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 14,
      backgroundColor: colors.header,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      color: colors.headerText,
      fontSize: 18,
      fontWeight: '700',
    },
    content: {
      padding: 18,
      gap: 16,
    },
    hero: {
      backgroundColor: colors.hero,
      borderRadius: 18,
      padding: 18,
      gap: 8,
    },
    heroEyebrow: {
      color: colors.accent,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontSize: 12,
      fontWeight: '700',
    },
    heroTitle: {
      color: colors.textStrong,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '800',
    },
    heroBody: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    sectionTitle: {
      color: colors.textStrong,
      fontSize: 17,
      fontWeight: '700',
    },
    label: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: '600',
    },
    hint: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      color: colors.inputText,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    choiceWrap: {
      gap: 10,
    },
    choiceRow: {
      flexDirection: 'row',
      gap: 10,
    },
    choiceRowWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    siteChip: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 3,
    },
    siteChipTitle: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: '700',
    },
    siteChipBody: {
      color: colors.textMuted,
      fontSize: 12,
    },
    choiceChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.surfaceAlt,
    },
    choiceChipSelected: {
      backgroundColor: alpha(colors.accent, '18'),
      borderColor: colors.accent,
    },
    choiceChipText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    choiceChipTextActive: {
      color: '#fff',
    },
    choiceChipTextActiveGreen: {
      color: colors.accent,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    togglePill: {
      width: 56,
      height: 32,
      borderRadius: 999,
      backgroundColor: colors.overlay,
      padding: 4,
      justifyContent: 'center',
    },
    togglePillActive: {
      backgroundColor: alpha(colors.accent, '60'),
    },
    toggleKnob: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#fff',
    },
    toggleKnobActive: {
      alignSelf: 'flex-end',
      backgroundColor: colors.accent,
    },
    secondaryBtn: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryBtnText: {
      color: colors.link,
      fontWeight: '600',
      fontSize: 14,
    },
    previewImage: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: 14,
      backgroundColor: colors.imagePanel,
    },
    pendingText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    slotCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 10,
      backgroundColor: colors.surfaceAlt,
    },
    slotHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    slotTitle: {
      color: colors.textStrong,
      fontSize: 15,
      fontWeight: '700',
    },
    slotFilename: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    slotPreview: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: 12,
      backgroundColor: colors.imagePanel,
    },
    defaultBtn: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    defaultBtnActive: {
      borderColor: colors.accent,
      backgroundColor: alpha(colors.accent, '18'),
    },
    defaultBtnText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    defaultBtnTextActive: {
      color: colors.accent,
    },
    primaryBtn: {
      marginTop: 6,
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    primaryBtnDisabled: {
      opacity: 0.7,
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      lineHeight: 18,
    },
  })
}
