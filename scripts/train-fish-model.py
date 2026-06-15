#!/usr/bin/env python3
"""
Fish species classifier training pipeline.
Fine-tunes MobileNetV2 on the Large Scale Fish Dataset.

Usage:
  pip install tensorflow pillow
  python scripts/train-fish-model.py --data-dir ./fish-data --output ./models

Dataset: https://www.kaggle.com/datasets/crowww/a-large-scale-fish-dataset
Expected structure:
  fish-data/
    fish/
      Bass/
        00001.png
        00002.png
      Trout/
        00001.png
        ...
"""

import argparse
import json
import os
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator

SPECIES_MAP = {
    'Bass': {'common_name': 'Largemouth Bass', 'scientific_name': 'Micropterus salmoides'},
    'Trout': {'common_name': 'Rainbow Trout', 'scientific_name': 'Oncorhynchus mykiss'},
    'Catfish': {'common_name': 'Channel Catfish', 'scientific_name': 'Ictalurus punctatus'},
    'Pike': {'common_name': 'Northern Pike', 'scientific_name': 'Esox lucius'},
    'Perch': {'common_name': 'Yellow Perch', 'scientific_name': 'Perca flavescens'},
    'Carp': {'common_name': 'Common Carp', 'scientific_name': 'Cyprinus carpio'},
    'Tuna': {'common_name': 'Atlantic Bluefin Tuna', 'scientific_name': 'Thunnus thynnus'},
    'Salmon': {'common_name': 'Chinook Salmon', 'scientific_name': 'Oncorhynchus tshawytscha'},
    'Snapper': {'common_name': 'Red Snapper', 'scientific_name': 'Lutjanus campechanus'},
}


def build_model(num_classes: int) -> Model:
    base = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    base.trainable = False

    x = base.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.3)(x)
    x = Dense(256, activation='relu')(x)
    x = Dropout(0.2)(x)
    predictions = Dense(num_classes, activation='softmax')(x)

    return Model(inputs=base.input, outputs=predictions)


def fine_tune(model: Model, train_gen, val_gen, epochs: int = 10):
    model.layers[-4].trainable = True  # unfreeze last block of MobileNetV2

    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-5),
        loss='categorical_crossentropy',
        metrics=['accuracy'],
    )

    model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=epochs,
        callbacks=[
            tf.keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True),
        ],
    )
    return model


def export_tflite(model: Model, output_path: str):
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_types = [tf.float16]
    tflite_model = converter.convert()

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(tflite_model)
    print(f'Exported: {output_path} ({len(tflite_model) / 1024 / 1024:.1f} MB)')


def generate_labels(class_indices: dict, output_path: str):
    labels = []
    idx_to_class = {v: k for k, v in class_indices.items()}
    for i in range(len(idx_to_class)):
        species_dir = idx_to_class[i]
        info = SPECIES_MAP.get(species_dir, {'common_name': species_dir, 'scientific_name': ''})
        labels.append({
            'index': i,
            'common_name': info['common_name'],
            'scientific_name': info['scientific_name'],
        })

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump({'labels': labels}, f, indent=2)
    print(f'Exported: {output_path} ({len(labels)} labels)')


def main():
    parser = argparse.ArgumentParser(description='Train fish species TFLite model')
    parser.add_argument('--data-dir', required=True, help='Path to fish dataset directory')
    parser.add_argument('--output', default='./models', help='Output directory')
    parser.add_argument('--epochs', type=int, default=15, help='Training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    args = parser.parse_args()

    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        zoom_range=0.2,
        validation_split=0.2,
    )

    train_gen = train_datagen.flow_from_directory(
        args.data_dir,
        target_size=(224, 224),
        batch_size=args.batch_size,
        class_mode='categorical',
        subset='training',
    )

    val_gen = train_datagen.flow_from_directory(
        args.data_dir,
        target_size=(224, 224),
        batch_size=args.batch_size,
        class_mode='categorical',
        subset='validation',
    )

    num_classes = train_gen.num_classes
    print(f'Training on {num_classes} species, {train_gen.samples} images')

    model = build_model(num_classes)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss='categorical_crossentropy',
        metrics=['accuracy'],
    )

    model.fit(train_gen, validation_data=val_gen, epochs=5)

    model = fine_tune(model, train_gen, val_gen, epochs=args.epochs)

    export_tflite(model, os.path.join(args.output, 'fish-classifier.tflite'))
    generate_labels(train_gen.class_indices, os.path.join(args.output, 'labels.json'))
    print('Done!')


if __name__ == '__main__':
    main()
