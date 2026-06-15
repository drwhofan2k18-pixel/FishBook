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
        console.error('Species search failed:', error.message);
        return;
      }

      setResults(data ?? []);
    } catch (err) {
      console.error('Species search error:', err);
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
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search species..."
            placeholderTextColor="#8E8E93"
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.speciesItem} onPress={() => handleSelect(item)}>
                <View style={styles.speciesIcon}>
                  <Ionicons name="fish-outline" size={24} color="#007AFF" />
                </View>
                <View style={styles.speciesInfo}>
                  <Text style={styles.commonName}>{item.common_name}</Text>
                  <Text style={styles.scientificName}>{item.scientific_name}</Text>
                  <Text style={styles.family}>{item.family}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
              </TouchableOpacity>
            )}
          />
        ) : query.length > 0 ? (
          <View style={styles.centerContent}>
            <Ionicons name="search-outline" size={48} color="#C7C7CC" />
            <Text style={styles.noResults}>No species found</Text>
            <Text style={styles.noResultsHint}>Try a different search term</Text>
          </View>
        ) : (
          <View style={styles.centerContent}>
            <Ionicons name="fish-outline" size={48} color="#C7C7CC" />
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
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    color: '#1C1C1E',
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  speciesIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F0FE',
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
    color: '#1C1C1E',
  },
  scientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#8E8E93',
    marginTop: 2,
  },
  family: {
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 1,
  },
  noResults: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
  },
  noResultsHint: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 4,
  },
});
