<?php

declare(strict_types=1);

namespace Dyg81\ModalBundle;

use Symfony\Component\Config\Definition\Builder\ArrayNodeDefinition;
use Symfony\Component\Config\Definition\Configurator\DefinitionConfigurator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use Symfony\Component\HttpKernel\Bundle\AbstractBundle;

final class Dyg81ModalBundle extends AbstractBundle
{
    public function configure(DefinitionConfigurator $definition): void
    {
        /** @var ArrayNodeDefinition $rootNode */
        $rootNode = $definition->rootNode();

        $rootNode
            ->children()
                ->scalarNode('translation_domain')
                    ->info('Translation domain used by the bundle templates.')
                    ->defaultValue('Dyg81ModalBundle')
                    ->cannotBeEmpty()
                ->end()
                ->scalarNode('default_modal_id')
                    ->info('DOM id of the modal element used when no custom id is given.')
                    ->defaultValue('base-modal')
                    ->cannotBeEmpty()
                    ->validate()
                        ->ifTrue(static fn ($id): bool => !\is_string($id) || 1 !== preg_match('/^[A-Za-z][A-Za-z0-9_-]*$/', $id))
                        ->thenInvalid('The modal id %s is not a valid HTML id (letters, digits, "-" and "_", starting with a letter).')
                    ->end()
                ->end()
            ->end();
    }

    /**
     * @param array<string, mixed> $config
     */
    public function loadExtension(array $config, ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        $container->parameters()
            ->set('dyg81_modal.translation_domain', $config['translation_domain'])
            ->set('dyg81_modal.default_modal_id', $config['default_modal_id']);

        $container->import('../config/services.php');
    }
}
