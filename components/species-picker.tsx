import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import type { IdentificationMatch } from '@/lib/catch-store';
import { captureError } from '@/lib/crash-reporting';
import { colors } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

interface Species {
  id: number;
  common_name: string;
  scientific_name: string;
  family: string;
}

interface SpeciesPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (species: IdentificationMatch) => void;
}

export default function SpeciesPicker({ visible, onClose, onSelect }: SpeciesPickerProps) {

  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Species[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchSpecies = useCallback(async (search: string) => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('species')
        .select('id, common_name, scientific_name, family')
        .or(`common_name.ilike.%${search}%,scientific_name.ilike.%${search}%`)
        .limit(30);

      if (error) {
        captureError(error, { context: 'species-search' });
        return;
      }

      setResults(data ?? []);
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), { context: 'species-search-unknown' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchSpecies(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchSpecies]);

  const handleSelect = (species: Species) => {
    onSelect({
      species_id: species.id,
      common_name: species.common_name,
      scientific_name: species.scientific_name,
      confidence: 1,
      iNaturalistTaxonId: 0,
      image_url: '',
    });
    setQuery('');
    setResults([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Species</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close species picker" accessibilityRole="button">
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search species..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.speciesItem} onPress={() => handleSelect(item)}>
                <View style={styles.speciesIcon}>
                  <Ionicons name="fish-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.speciesInfo}>
                  <Text style={styles.commonName}>{item.common_name}</Text>
                  <Text style={styles.scientificName}>{item.scientific_name}</Text>
                  <Text style={styles.family}>{item.family}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          />
        ) : query.length > 0 ? (
          <View style={styles.centerContent}>
            <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.noResults}>No species found</Text>
            <Text style={styles.noResultsHint}>Try a different search term</Text>
          </View>
        ) : (
          <View style={styles.centerContent}>
            <Ionicons name="fish-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.noResults}>Type to search species</Text>
            <Text style={styles.noResultsHint}>
              Search by common name or scientific name
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  speciesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  speciesIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  speciesInfo: {
    flex: 1,
  },
  commonName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginTop: 2,
  },
  family: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 1,
  },
  noResults: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
  },
  noResultsHint: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 4,
  },
});
