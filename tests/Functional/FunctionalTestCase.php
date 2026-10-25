<?php

declare(strict_types=1);

namespace Dyg81\ModalBundle\Tests\Functional;

use Dyg81\ModalBundle\Tests\Fixtures\TestKernel;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpKernel\KernelInterface;

abstract class FunctionalTestCase extends WebTestCase
{
    /**
     * @param array<string, mixed> $options
     */
    protected static function createKernel(array $options = []): KernelInterface
    {
        return new TestKernel(
            $options['environment'] ?? 'test',
            $options['debug'] ?? true,
            $options['dyg81_modal'] ?? [],
        );
    }
}
